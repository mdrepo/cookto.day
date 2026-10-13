import { expect } from "bun:test";

// specs/61-saving-data.md, criterion 2: what every record store must do
// (ADR 0024). Each store's tests run these checks on it: the one in memory
// with bun test, IndexedDB in real browsers.

/**
 * What a record store looks like, as the contract sees it. Written out here,
 * not imported, so @cookto/testing doesn't depend on @cookto/data, whose
 * tests use it.
 */
interface RecordStore {
  get<T>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<T | null>;
  all<T>(collection: string, signal?: AbortSignal): Promise<T[]>;
  put(collection: string, records: readonly Note[]): Promise<void>;
}

type Make = () => RecordStore | Promise<RecordStore>;

interface Note {
  id: string;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
  text: string;
}

const note = (id: string, text: string): Note => ({
  id,
  version: 1,
  updatedAt: "2026-10-13T08:00:00.000Z",
  deletedAt: null,
  text,
});

export const RECORD_STORE_CONTRACT: {
  name: string;
  check: (make: Make) => Promise<void>;
}[] = [
  {
    name: "a record put in a collection can be read back by its id",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("a", "first")]);
      expect(await store.get<Note>("notes", "a")).toEqual(note("a", "first"));
    },
  },
  {
    name: "putting a record again replaces it",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("a", "first")]);
      await store.put("notes", [{ ...note("a", "second"), version: 2 }]);
      expect((await store.get<Note>("notes", "a"))?.text).toBe("second");
    },
  },
  {
    name: "the collection lists every record, in id order",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("b", "two"), note("a", "one")]);
      await store.put("other", [note("c", "elsewhere")]);
      const all = await store.all<Note>("notes");
      expect(all.map((n) => n.id)).toEqual(["a", "b"]);
    },
  },
  {
    name: "an id that isn't there gives nothing, not an error",
    async check(make) {
      const store = await make();
      expect(await store.get("notes", "missing")).toBeNull();
      expect(await store.all("empty")).toEqual([]);
    },
  },
  {
    name: "putting several records saves all of them or none",
    async check(make) {
      const store = await make();
      const broken = {
        ...note("x", "no id"),
        id: undefined,
      } as unknown as Note;
      let failed = false;
      try {
        await store.put("notes", [note("a", "kept?"), broken]);
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
      expect(await store.get("notes", "a")).toBeNull();
    },
  },
  {
    name: "a cancelled read stops with an abort, and never returns",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("a", "first")]);
      const signal = AbortSignal.abort();
      for (const read of [
        () => store.get("notes", "a", signal),
        () => store.all("notes", signal),
      ]) {
        let error: unknown = null;
        try {
          await read();
        } catch (e) {
          error = e;
        }
        expect((error as { name?: string } | null)?.name).toBe("AbortError");
      }
    },
  },
];
