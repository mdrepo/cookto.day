import { describe, expect, test } from "bun:test";
import { memoryRecordStore, type RecordStore } from "../src/record-store.js";
import { type SaveProblem, watchSaves } from "../src/saves.js";

// specs/138-save-errors.md: a failed save is a value with a kind (ADR 0024),
// so the app can say so; the next save that works clears it.

/** A store whose saves fail as the browser's do, until `works` is set. */
function failing(name: string) {
  const real = memoryRecordStore();
  const state = { works: false };
  const store: RecordStore = {
    get: (collection, id, signal) => real.get(collection, id, signal),
    all: (collection, signal) => real.all(collection, signal),
    put: (collection, records) =>
      state.works
        ? real.put(collection, records)
        : Promise.reject(new DOMException("Saving failed", name)),
  };
  return { store, state };
}

describe("watching saves", () => {
  test("a phone out of space is 'storage-full'; the save still fails", async () => {
    const seen: (SaveProblem | null)[] = [];
    const { store } = failing("QuotaExceededError");
    const watched = watchSaves(store, (p) => seen.push(p));
    const saved = await watched.put("pantry", [{ id: "a" }]).then(
      () => "saved",
      () => "failed",
    );
    expect(saved).toBe("failed");
    expect(seen).toEqual(["storage-full"]);
  });

  test("any other failure is 'unknown', and the next save that works clears it", async () => {
    const seen: (SaveProblem | null)[] = [];
    const { store, state } = failing("UnknownError");
    const watched = watchSaves(store, (p) => seen.push(p));
    await watched.put("pantry", [{ id: "a" }]).catch(() => undefined);
    state.works = true;
    await watched.put("pantry", [{ id: "a" }]);
    expect(seen).toEqual(["unknown", null]);
    expect(await watched.get<{ id: string }>("pantry", "a")).toEqual({
      id: "a",
    });
    expect(await watched.all<{ id: string }>("pantry")).toEqual([{ id: "a" }]);
  });
});
