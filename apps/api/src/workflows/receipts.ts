import type { Adding, Answer, ReceiptRow } from "@cookto/engine";
import {
  type Added,
  addFromReceipt,
  undoReceipt,
} from "@cookto/usecases/receipt";
import { receiptKitchen } from "../household/receipt-kitchen.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import {
  agreedRun,
  askLine,
  type InChat,
  namesOf,
  readInChat,
  word,
} from "../receipts/chat.js";
import type { Action } from "./deps.js";
import { runId, startRun } from "./tomorrow.js";

// A receipt photo in the chat (specs/277): "Read it" remembers the member
// agreed and reads; "Add {n}" adds what was found for the household, says
// so with Undo, then asks the lines it wasn't sure of, one at a time.

const kitchen = (d: MessengerDeps, household: string) =>
  receiptKitchen(d.households, household, () => iso(d.now()), d.packs);

const inChat = (
  d: MessengerDeps,
  run: Parameters<Action>[0]["run"],
): InChat => ({
  d,
  household: run.household,
  member: run.audience,
  seed: run.id,
});

/** "Paneer", "Paneer and onion", "Paneer, onion and egg". */
function andList(names: string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

/** "Paneer is off the list.", or nothing when nothing came off it. */
async function unlistedWords(
  d: MessengerDeps,
  household: string,
  unlisted: string[],
): Promise<string> {
  if (unlisted.length === 0) return "";
  const name = await namesOf(d, household);
  const foods = andList(
    unlisted.map((id, i) =>
      i === 0 ? name(id) : name(id).toLocaleLowerCase("en"),
    ),
  );
  const id =
    unlisted.length === 1 ? "receipt_unlisted" : "receipt_unlisted_many";
  return word(d, id, { Foods: foods });
}

const answerOf = (key: string, row: ReceiptRow): Answer | null => {
  if (key === "skip") return { skip: true };
  if (key === "asis") return { asIs: true };
  const food = row.kind === "not-sure" ? row.foods[Number(key.slice(1))] : null;
  return food ? { food } : null;
};

export const RECEIPT_ACTIONS: Record<string, Action> = {
  agreeAndRead: async ({ run, d }) => {
    await startRun(d, run.household, agreedRun(run.audience), {
      workflow: "receipts_agreed",
      audience: run.audience,
      about: {},
    });
    await readInChat(inChat(d, run), String(run.about.ref));
  },
  addReceipt: async ({ run, d }) => {
    const adding = run.about.adding as Adding[];
    const boughtOn = String(run.about.boughtOn);
    const added = await addFromReceipt(
      await kitchen(d, run.household),
      adding,
      [],
      boughtOn,
    );
    await startRun(d, run.household, runId(`${run.id}:added`), {
      workflow: "receipt_added",
      audience: run.audience,
      about: {
        n: adding.length,
        unlisted: await unlistedWords(d, run.household, added.unlisted),
        added,
      },
    });
    const unsure = run.about.unsureRows as ReceiptRow[];
    await askLine(inChat(d, run), unsure, boughtOn);
  },
  undoReceipt: async ({ run, d }) => {
    await undoReceipt(
      await kitchen(d, run.household),
      run.about.added as Added,
    );
  },
  answerLine: async ({ run, input, d }) => {
    const row = run.about.row as ReceiptRow;
    const answer = input.kind === "button" ? answerOf(input.key, row) : null;
    if (!answer) return;
    const food = "food" in answer ? answer.food : undefined;
    const adding: Adding[] =
      "skip" in answer
        ? []
        : [
            {
              name: row.name,
              amount: row.amount,
              unit: row.unit,
              ...(food && { food }),
            },
          ];
    const boughtOn = String(run.about.boughtOn);
    await addFromReceipt(
      await kitchen(d, run.household),
      adding,
      [{ name: row.name, answer }],
      boughtOn,
    );
    const name = food ? (await namesOf(d, run.household))(food) : row.name;
    const workflow =
      "skip" in answer ? "receipt_line_skipped" : "receipt_line_added";
    await startRun(d, run.household, runId(`${run.id}:said`), {
      workflow,
      audience: run.audience,
      about: { name },
    });
    await askLine(inChat(d, run), run.about.rest as ReceiptRow[], boughtOn);
  },
};
