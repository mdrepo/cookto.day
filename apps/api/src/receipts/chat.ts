import { addDays, type Adding, type ReceiptRow } from "@cookto/engine";
import { dayWords } from "@cookto/engine/time";
import { render } from "@cookto/templates";
import { receiptRows } from "@cookto/usecases/receipt";
import { receiptKitchen } from "../household/receipt-kitchen.js";
import { clockOf, schedule } from "../household/schedule.js";
import { householdPacks } from "../household/tomorrow-plan.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import { LIMITS } from "../usage/limits.js";
import { runId, startRun } from "../workflows/tomorrow.js";
import { type Counted, readCounted } from "./counted.js";
import { MAX_PHOTO_BYTES, photoType } from "./photo.js";
import type { Receipt } from "./receipt.js";

// A receipt photo read in the chat (specs/277): fetched from the channel
// into memory, read within the app's limits (the Telegram account in the
// network address's place), and answered: what was found, with Add, or
// what stopped it. Nothing of the photo is kept or logged.

/** Who sent it, and the seed their runs are named by. */
export interface InChat {
  d: MessengerDeps;
  household: string;
  member: string;
  seed: string;
}

/** That a member agreed to send photos to Google (specs/277): once. */
export const agreedRun = (member: string) => runId(`${member}:receipts-agreed`);

export const word = (d: MessengerDeps, id: string, slots = {}) =>
  render(d.workflows?.templates ?? { en: {} }, "en", id, slots).text;

/** A run that says these words to the member, once for its seed. */
export const say = (c: InChat, as: string, lines: string, more = {}) =>
  startRun(c.d, c.household, runId(`${c.seed}:${as}`), {
    workflow: "cmd_said",
    audience: c.member,
    about: { lines, ...more },
  });

/** Each food's English name, as /list says it. */
export async function namesOf(d: MessengerDeps, household: string) {
  const packs = await householdPacks(d.households, household, d.packs);
  return (id: string) =>
    packs.map((p) => p.words.en?.ingredients[id]).find(Boolean) ?? id;
}

const limitOf = (name: string) => LIMITS.find((l) => l.name === name)?.max;

/** What stopped a read, in the app's words (specs/129, criterion 13). */
function stopped(d: MessengerDeps, read: Exclude<Counted, { ok: true }>) {
  if (read.status === 422)
    return word(
      d,
      read.error === "rejected" ? "receipt_rejected" : "receipt_not_receipt",
    );
  if (read.status === 429 && read.limit === "household-day")
    return word(d, "receipt_limit_day", { n: limitOf(read.limit) });
  if (read.status === 429 && read.limit === "household-month")
    return word(d, "receipt_limit_month", { n: limitOf(read.limit) });
  return word(d, "receipt_not_working");
}

/** The photo, read; its log line has counts and codes, never content. */
async function readIt(c: InChat, ref: string): Promise<Counted | null> {
  const r = c.d.receipts;
  const started = c.d.now();
  const bytes = await c.d.messenger.channel.file?.(ref, MAX_PHOTO_BYTES);
  const type = bytes ? photoType(bytes) : null;
  const route = "receipts/telegram";
  if (!r?.reader || !bytes || !type) {
    const error = r?.reader ? "photo" : "off";
    c.d.log({ route, status: 503, error, ms: c.d.now() - started });
    return null;
  }
  const read = await readCounted(
    { reader: r.reader, usage: r.usage, strikes: r.strikes },
    { household: c.household, address: `telegram:${c.member}` },
    { bytes, type },
  );
  c.d.log({
    route,
    status: read.ok ? 200 : read.status,
    ms: c.d.now() - started,
    ...(!read.ok && { error: read.error }),
    ...("sign" in read && { sign: read.sign }),
    ...("lines" in read && { lines: read.lines }),
    ...("tokensIn" in read && {
      tokensIn: read.tokensIn,
      tokensOut: read.tokensOut,
    }),
  });
  return read;
}

/** The receipt's day, as the chat says it: today, yesterday, or its date. */
function heading(c: InChat, receipt: Receipt, today: string) {
  const shop = receipt.shop ?? word(c.d, "receipt_your");
  const lines = receipt.lines.length;
  if (!receipt.date)
    return word(c.d, "receipt_heading_undated", { shop, lines });
  const day =
    receipt.date === today
      ? word(c.d, "word_today")
      : receipt.date === addDays(today, -1)
        ? word(c.d, "receipt_yesterday")
        : dayWords(receipt.date, "en", { day: "numeric", month: "short" });
  return word(c.d, "receipt_heading", { shop, day, lines });
}

/** "paneer 800 g", "eggs 15", "ginger 150 g (check this line)". */
function itemWords(
  d: MessengerDeps,
  r: ReceiptRow,
  name: (id: string) => string,
) {
  const named =
    r.kind === "found" ? name(r.food).toLocaleLowerCase("en") : r.name;
  const amount =
    r.amount === null || r.unit === null
      ? ""
      : r.unit === "pieces"
        ? ` ${String(r.amount)}`
        : ` ${String(r.amount)} ${r.unit}`;
  return `${named}${amount}${r.check ? ` ${word(d, "receipt_check")}` : ""}`;
}

const adding = (r: ReceiptRow): Adding => ({
  name: r.name,
  amount: r.amount,
  unit: r.unit,
  ...(r.kind === "found" && { food: r.food }),
});

/**
 * Reads the photo and says what it found, with Add {n}; with nothing
 * found, the lines it isn't sure of are asked straight away.
 */
export async function readInChat(c: InChat, ref: string): Promise<string> {
  const read = await readIt(c, ref);
  if (!read?.ok) {
    const why = read ? stopped(c.d, read) : word(c.d, "receipt_not_working");
    await say(c, "stopped", why);
    return read ? `receipt-${read.error}` : "receipt-unreadable";
  }
  const now = () => iso(c.d.now());
  const k = await receiptKitchen(c.d.households, c.household, now, c.d.packs);
  const rows = await receiptRows(k, read.receipt);
  const today =
    clockOf(await schedule(c.d.households, c.household), now())?.day ??
    now().slice(0, 10);
  const date = read.receipt.date;
  const boughtOn = date && date <= today ? date : today;
  const name = await namesOf(c.d, c.household);
  const found = rows.filter((r) => r.kind !== "not-sure");
  const unsure = rows.filter((r) => r.kind === "not-sure");
  const words = {
    heading: heading(c, read.receipt, today),
    found: found.length
      ? word(c.d, "receipt_found_list", {
          items: found.map((r) => itemWords(c.d, r, name)).join(", "),
        })
      : "",
    unsure: unsure.length
      ? word(c.d, "receipt_unsure_list", {
          names: unsure.map((r) => r.name).join(", "),
        })
      : "",
  };
  const run = (workflow: string, about: Record<string, unknown>) =>
    startRun(c.d, c.household, runId(`${c.seed}:${workflow}`), {
      workflow,
      audience: c.member,
      about,
    });
  if (found.length > 0) {
    await run("receipt_found", {
      ...words,
      n: found.length,
      adding: found.map(adding),
      // Its rows, apart from the words that name them.
      unsureRows: unsure,
      boughtOn,
    });
    return "receipt-found";
  }
  await run("receipt_unsure", words);
  await askLine(c, unsure, boughtOn);
  return "receipt-unsure";
}

/** Labels fit WhatsApp's 20 characters (packages/templates). */
const label = (words: string) =>
  words.length > 20 ? `${words.slice(0, 19)}…` : words;

/**
 * The first line it isn't sure of, asked on its own: as it is, skip, or
 * the foods its word could be. Each answer asks the next (specs/277).
 */
export async function askLine(
  c: InChat,
  rows: readonly ReceiptRow[],
  boughtOn: string,
): Promise<void> {
  const [row, ...rest] = rows;
  if (!row) return;
  const name = await namesOf(c.d, c.household);
  const foods = row.kind === "not-sure" ? row.foods.slice(0, 3) : [];
  const keys = foods.map((_, i) => `f${String(i)}`);
  const labels = Object.fromEntries(
    foods.map((food, i) => [`f${String(i)}`, label(name(food))]),
  );
  const workflow = foods.length ? "receipt_line_foods" : "receipt_line";
  await startRun(c.d, c.household, runId(`${c.seed}:line:${row.name}`), {
    workflow,
    audience: c.member,
    about: {
      name: row.name,
      row,
      rest,
      boughtOn,
      ...labels,
      ...(foods.length > 0 && { buttons: [...keys, "asis", "skip"] }),
    },
  });
}
