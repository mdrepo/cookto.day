import type { Button, Event } from "@cookto/messenger";
import type { Photo, ReaderResult } from "../src/receipts/reader.js";
import { jpeg, ledger } from "./support.js";
import {
  evening,
  type Evening,
  type EveningOptions,
} from "./tomorrow-support.js";

// specs/277-receipt-photo-in-telegram.md: Mayur plans and Sunita cooks, in
// Asia/Kolkata, on Wednesday 21 October; North Indian loaded. The reader
// is faked at the AI's edge and the limits run for real (ADR 0028); the
// receipt is made up, never a real one.

export const SUNITA = { id: "77", name: "Sunita" };
export const YESTERDAY = "2026-10-20";
export const PANEER = "Q1139546";
export const ONION = "Q3406628";
export const EGG = "Q15260613";
export const TOMATO = "Q20638126";
export const GINGER = "Q15046077";

/** Criterion 3's receipt, in the rows the AI answers with. */
export const FRESH_MART = {
  shop: "Fresh Mart",
  date: YESTERDAY,
  lines: [
    "Fresh Paneer 200G|4|90.00|360.00",
    "Red Onions 700G|1||42.00",
    "15 Eggs|1||105.00",
    "Local Tomatoes|1||30.00",
    "Loose Ginger|0.15|120.00|20.00",
    "Velvet Almond Milk Drink|1||199.00",
  ],
};

export const answer = (output: unknown): ReaderResult => ({
  ok: true,
  output,
  tokensIn: 300,
  tokensOut: 120,
});

export const texts = (s: { text: string }[]) => s.map((x) => x.text);
export const labels = (s: { buttons: { label: string }[] } | undefined) =>
  (s?.buttons ?? []).map((b) => b.label);
export const command = (name: string) => ({ kind: "command", name }) as Event;

export interface ReceiptChat {
  e: Evening;
  /** What the AI answers next, and every photo it was given. */
  ai: { next: ReaderResult; seen: Photo[] };
  counts: ReturnType<typeof ledger>;
  /** Sends a photo Telegram holds under `ref` (made a small JPEG). */
  photo: (chat: string, ref?: string) => Promise<void>;
  /** Presses a button on the latest message to `chat` that has it. */
  tap: (chat: string, label: string) => Promise<void>;
  /** The household's live records in a collection, as the server has them. */
  live: (collection: string) => Record<string, unknown>[];
}

export async function receiptChat(
  more: EveningOptions = {},
): Promise<ReceiptChat> {
  const e = await evening({ cook: SUNITA, ...more });
  e.at("18:30");
  const counts = ledger("2026-10-21T13:00:00Z");
  const ai = { next: answer(FRESH_MART), seen: [] as Photo[] };
  e.h.deps.receipts = {
    reader: {
      read: (photo) => {
        ai.seen.push(photo);
        return Promise.resolve(ai.next);
      },
    },
    usage: counts.usage,
    strikes: counts.strikes,
  };
  let n = 0;
  return {
    e,
    ai,
    counts,
    photo: async (chat, ref) => {
      const name = ref ?? `photo-${String(++n)}`;
      if (!e.h.channel.files.has(name)) e.h.channel.files.set(name, jpeg());
      await e.say(chat, { kind: "photo", ref: name, caption: null });
    },
    tap: async (chat, label) => {
      const has = (b: Button) => b.label === label && "value" in b;
      const last = e.h.channel.deliveries
        .filter(
          (d) =>
            d.chat === chat &&
            d.message.kind === "buttons" &&
            d.message.buttons.flat().some(has),
        )
        .at(-1);
      const b =
        last?.message.kind === "buttons"
          ? last.message.buttons.flat().find(has)
          : undefined;
      if (!b || !("value" in b)) throw new Error(`no button "${label}"`);
      await e.say(chat, { kind: "button", value: b.value, answers: null });
    },
    live: (collection) =>
      e.h.households.records
        .filter(
          (r) => r.household === e.household && r.collection === collection,
        )
        .map((r) => r.record)
        .filter((r) => r.deletedAt === null || r.deletedAt === undefined),
  };
}

/** A photo sent and agreed to: the person's next photos aren't asked about. */
export async function agreed(r: ReceiptChat, chat: string) {
  await r.photo(chat);
  await r.tap(chat, "Read it");
  r.e.to(chat);
}
