import assert from "node:assert/strict";

// specs/61-saving-data.md, criterion 2: what every record store must do
// (ADR 0024). Each store's tests run these checks on it: the one in memory
// with bun test, IndexedDB in real browsers through Playwright. So they use
// node:assert, which both runners have.

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
  /** Every record of the collection, gone (specs/217: joining a household). */
  clear(collection: string): Promise<void>;
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
      assert.deepEqual(await store.get<Note>("notes", "a"), note("a", "first"));
    },
  },
  {
    name: "putting a record again replaces it",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("a", "first")]);
      await store.put("notes", [{ ...note("a", "second"), version: 2 }]);
      assert.equal((await store.get<Note>("notes", "a"))?.text, "second");
    },
  },
  {
    name: "the collection lists every record, in id order",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("b", "two"), note("a", "one")]);
      await store.put("other", [note("c", "elsewhere")]);
      const all = await store.all<Note>("notes");
      assert.deepEqual(
        all.map((n) => n.id),
        ["a", "b"],
      );
    },
  },
  {
    name: "an id that isn't there gives nothing, not an error",
    async check(make) {
      const store = await make();
      assert.equal(await store.get("notes", "missing"), null);
      assert.deepEqual(await store.all("empty"), []);
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
      assert.equal(failed, true);
      assert.equal(await store.get("notes", "a"), null);
    },
  },
  {
    name: "clearing a collection empties it, and leaves the others",
    async check(make) {
      const store = await make();
      await store.put("notes", [note("a", "first"), note("b", "second")]);
      await store.put("lists", [note("x", "kept")]);
      await store.clear("notes");
      assert.deepEqual(await store.all<Note>("notes"), []);
      assert.equal(await store.get<Note>("notes", "a"), null);
      assert.equal((await store.all<Note>("lists")).length, 1);
      await store.clear("never-there");
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
        assert.equal((error as { name?: string } | null)?.name, "AbortError");
      }
    },
  },
];
