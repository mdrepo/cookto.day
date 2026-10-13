// Where repositories keep records (ADR 0024): collections of records by id.
// The web app passes the IndexedDB store; tests and the prerender pass the
// one in memory. Every store passes the same contract
// (@cookto/testing/record-store-contract).

export interface RecordStore {
  /** The record with this id, or null. */
  get<T>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<T | null>;
  /** Every record in the collection, in id order. */
  all<T>(collection: string, signal?: AbortSignal): Promise<T[]>;
  /** Saves every record, replacing any with the same id: all, or none. */
  put(collection: string, records: readonly { id: string }[]): Promise<void>;
}

/** A record store in memory. */
export function memoryRecordStore(): RecordStore {
  const collections = new Map<string, Map<string, unknown>>();
  const of = (name: string) => {
    let records = collections.get(name);
    if (!records) {
      records = new Map();
      collections.set(name, records);
    }
    return records;
  };
  return {
    get<T>(collection: string, id: string, signal?: AbortSignal) {
      signal?.throwIfAborted();
      const record = of(collection).get(id);
      return Promise.resolve(
        record === undefined ? null : (structuredClone(record) as T),
      );
    },
    all<T>(collection: string, signal?: AbortSignal) {
      signal?.throwIfAborted();
      const records = [...of(collection).entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([, record]) => structuredClone(record) as T);
      return Promise.resolve(records);
    },
    put(collection, records) {
      if (records.some((r) => typeof (r as { id?: unknown }).id !== "string"))
        return Promise.reject(new TypeError("Every record needs a string id."));
      const into = of(collection);
      for (const record of records)
        into.set(record.id, structuredClone(record));
      return Promise.resolve();
    },
  };
}
