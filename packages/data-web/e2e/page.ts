import { indexedDbRecordStore } from "../src/index.js";

// The page the IndexedDB tests drive (specs/61-saving-data.md, criterion 4):
// it holds an IndexedDB record store, and answers calls from the test, run
// in Node, through window.recordStore.

const NAME = "cookto-e2e";

export interface Call {
  method: "get" | "all" | "put";
  args: unknown[];
  aborted: boolean;
}
export type Answer =
  { ok: true; value: unknown } | { ok: false; name: string; message: string };

let store = indexedDbRecordStore(NAME);

async function answer({ method, args, aborted }: Call): Promise<Answer> {
  const signal = aborted ? AbortSignal.abort() : undefined;
  const [collection, second] = args as [string, unknown];
  try {
    if (method === "put") {
      await store.put(collection, second as { id: string }[]);
      return { ok: true, value: null };
    }
    const value =
      method === "get"
        ? await store.get(collection, second as string, signal)
        : await store.all(collection, signal);
    return { ok: true, value };
  } catch (e) {
    const error = e as Error;
    return { ok: false, name: error.name, message: error.message };
  }
}

/** Throws the database away, and starts a new store on an empty one. */
async function reset(): Promise<void> {
  await store.close();
  await new Promise<void>((done, fail) => {
    const request = indexedDB.deleteDatabase(NAME);
    request.onsuccess = () => {
      done();
    };
    request.onerror = () => {
      fail(request.error ?? new Error("deleteDatabase failed"));
    };
  });
  store = indexedDbRecordStore(NAME);
}

Object.assign(window, { recordStore: answer, resetRecords: reset });
