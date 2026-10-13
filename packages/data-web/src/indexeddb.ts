import type { RecordStore } from "@cookto/data";

// The record store in the browser (ADR 0024): one IndexedDB object store,
// keyed by [collection, id], so a collection reads back in id order. It
// passes @cookto/testing's record store contract in every browser we test.

const RECORDS = "records";
const VERSION = 1;

interface Row {
  c: string;
  id: string;
  record: unknown;
}

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    const fail = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(RECORDS, { keyPath: ["c", "id"] });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error(`Opening ${name} failed`));
    };
  });
}

/** Every key in one collection: ids are strings, and arrays sort after them. */
const inCollection = (c: string) => IDBKeyRange.bound([c, ""], [c, []]);

export function indexedDbRecordStore(
  name: string,
): RecordStore & { close(): Promise<void> } {
  let database: Promise<IDBDatabase> | null = null;
  const db = () => (database ??= open(name));

  async function read<T>(
    signal: AbortSignal | undefined,
    request: (records: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    signal?.throwIfAborted();
    const records = (await db())
      .transaction(RECORDS, "readonly")
      .objectStore(RECORDS);
    const result = await promised(request(records));
    // Cancelled while reading: the answer never lands (ADR 0024).
    signal?.throwIfAborted();
    return result;
  }

  return {
    async get<T>(collection: string, id: string, signal?: AbortSignal) {
      const row = (await read(signal, (r) => r.get([collection, id]))) as
        Row | undefined;
      return row ? (row.record as T) : null;
    },
    async all<T>(collection: string, signal?: AbortSignal) {
      const rows = (await read(signal, (r) =>
        r.getAll(inCollection(collection)),
      )) as Row[];
      return rows.map((row) => row.record as T);
    },
    async put(collection, records) {
      if (records.some((r) => typeof (r as { id?: unknown }).id !== "string"))
        throw new TypeError("Every record needs a string id.");
      const transaction = (await db()).transaction(RECORDS, "readwrite");
      const into = transaction.objectStore(RECORDS);
      for (const record of records)
        into.put({ c: collection, id: record.id, record } satisfies Row);
      // One transaction: every record is saved, or none is.
      await finished(transaction);
    },
    async close() {
      const open = database;
      database = null;
      (await open)?.close();
    },
  };
}
