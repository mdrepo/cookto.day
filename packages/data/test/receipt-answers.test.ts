import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createReceiptAnswers } from "../src/receipt-answers.js";
import { memoryRecordStore } from "../src/record-store.js";
import { SYNC_TOPICS } from "../src/sync-topics.js";

// specs/129, criterion 12: what a household answered about a receipt's
// line, kept as one record that syncs, so no phone in it asks again.

describe("a household's receipt answers", () => {
  test("none at first; each answer is kept, the newest wins, and it's announced", async () => {
    const changes = createChanges();
    const announced: string[] = [];
    changes.subscribe((topic) => {
      announced.push(topic);
    });
    const store = memoryRecordStore();
    const { reader, writer } = createReceiptAnswers(store, { changes });
    expect(await reader.answers()).toEqual({});
    await writer.answer("velvet almond milk drink", { asIs: true });
    await writer.answer("coca cola zero sugar", { skip: true });
    await writer.answer("coca cola zero sugar", { food: "cola" });
    expect(await reader.answers()).toEqual({
      "velvet almond milk drink": { asIs: true },
      "coca cola zero sugar": { food: "cola" },
    });
    expect(announced).toEqual([
      "receipt-answers",
      "receipt-answers",
      "receipt-answers",
    ]);
    expect(await store.all("receipt-answers")).toHaveLength(1);
  });

  test("the answers sync with the household", () => {
    expect(SYNC_TOPICS["receipt-answers"]).toBe("receipt-answers");
  });
});
