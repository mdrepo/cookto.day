import type { Answer } from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, type SyncRecord, updated } from "./records.js";

// What a household answered about a receipt's lines (specs/129): "add as it
// is", "skip", or which food it is, by the line's tidied words. One record
// at one id, synced like the household's settings, so no phone in it asks
// about the same line again.

export const RECEIPT_ANSWERS = "receipt-answers";
const ID = "answers";

type Stored = { lines: Record<string, Answer> } & SyncRecord;

export interface ReceiptAnswersReader {
  answers(signal?: AbortSignal): Promise<Record<string, Answer>>;
}

export interface ReceiptAnswersWriter {
  /** The answer for a line's key; a newer answer replaces an older one. */
  answer(key: string, answer: Answer): Promise<void>;
}

export function createReceiptAnswers(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: ReceiptAnswersReader; writer: ReceiptAnswersWriter } {
  const stored = async (signal?: AbortSignal) => {
    const record = await store.get<Stored>(RECEIPT_ANSWERS, ID, signal);
    return record?.deletedAt === null ? record : null;
  };
  return {
    reader: {
      async answers(signal) {
        return { ...(await stored(signal))?.lines };
      },
    },
    writer: {
      async answer(key, answer) {
        const at = now();
        const record = await stored();
        const next = record
          ? updated(record, { lines: { ...record.lines, [key]: answer } }, at)
          : { ...created({ lines: { [key]: answer } }, at), id: ID };
        await store.put(RECEIPT_ANSWERS, [next]);
        changes.announce(RECEIPT_ANSWERS);
      },
    },
  };
}
