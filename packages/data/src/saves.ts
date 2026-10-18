import { createStore, type StoreApi } from "zustand/vanilla";
import type { RecordStore } from "./record-store.js";

// A failed save is a value with a kind (ADR 0024, specs/138): the app says
// so instead of losing the change without a word.

/** Why a save failed, as the person is told. */
export type SaveProblem = "storage-full" | "unknown";

/** The kind of a save's failure: the browser names a full disk. */
export function problemOf(error: unknown): SaveProblem {
  return error instanceof Error && error.name === "QuotaExceededError"
    ? "storage-full"
    : "unknown";
}

/**
 * The same store, reporting each save: its problem when it fails (the save
 * still fails), or null when it works, which clears an earlier problem.
 */
export function watchSaves(
  store: RecordStore,
  report: (problem: SaveProblem | null) => void,
): RecordStore {
  return {
    get: (collection, id, signal) => store.get(collection, id, signal),
    all: (collection, signal) => store.all(collection, signal),
    async put(collection, records) {
      try {
        await store.put(collection, records);
      } catch (error) {
        report(problemOf(error));
        throw error;
      }
      report(null);
    },
  };
}

/** The last save's problem, app-wide (ADR 0023): null once a save works. */
export type SaveProblems = StoreApi<{ problem: SaveProblem | null }>;

/** Where `watchSaves` reports, and what the app's note reads and clears. */
export function createSaveProblems(): {
  store: SaveProblems;
  report: (problem: SaveProblem | null) => void;
} {
  const store = createStore<{ problem: SaveProblem | null }>(() => ({
    problem: null,
  }));
  return {
    store,
    report: (problem) => {
      store.setState({ problem });
    },
  };
}
