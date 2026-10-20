import { beforeEach, describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { memoryKeyValue } from "../src/kv.js";
import type { PushedRecord } from "../src/network.js";
import { createPlans } from "../src/plans.js";
import { memoryRecordStore } from "../src/record-store.js";
import type { SyncRecord } from "../src/records.js";
import { createSync, SYNC_KEY, type Sync } from "../src/sync.js";
import { type FakeServer, fakeServer } from "./sync-server.js";

// specs/217, the phone's half of sync, the pull (ADR 0033): changes after
// the cursor land through the same store and are announced; older ones are
// skipped; pages until there are no more; a stale cursor starts over.

let server: FakeServer;
let kv: ReturnType<typeof memoryKeyValue>;
let announced: string[];
let timers: { fn: () => void; ms: number }[];
let sync: Sync;
let plans: ReturnType<typeof createPlans>;
const T0 = "2026-10-20T19:00:00.000Z";

function build() {
  const changes = createChanges();
  changes.subscribe((topic) => announced.push(topic));
  sync = createSync({
    store: memoryRecordStore(),
    api: server,
    kv,
    changes,
    pauseMs: 2_000,
    schedule: (fn, ms) => {
      const timer = { fn, ms };
      timers.push(timer);
      return () => {
        timers.splice(timers.indexOf(timer), 1);
      };
    },
  });
  plans = createPlans(sync.store, { changes, now: () => T0 });
}

beforeEach(() => {
  server = fakeServer();
  kv = memoryKeyValue();
  announced = [];
  timers = [];
  build();
});

const stored = <T>(collection: string, id: string) =>
  sync.store.get<T & SyncRecord>(collection, id);

describe("pull", () => {
  test("another phone's changes land in the store and are announced; older ones are skipped", async () => {
    server.put("plans", {
      id: "p-9",
      version: 2,
      updatedAt: T0,
      deletedAt: null,
      on: "2026-10-22",
      slot: "lunch",
      dish: "chole",
    });
    expect(await sync.run()).toBe("synced");
    expect(await stored<{ dish: string }>("plans", "p-9")).toMatchObject({
      dish: "chole",
      version: 2,
    });
    expect(announced).toEqual(["plans"]);
    expect(sync.cursor()).toBe(1);

    server.put("plans", {
      id: "p-9",
      version: 1,
      updatedAt: T0,
      deletedAt: null,
      dish: "old",
    });
    announced.length = 0;
    await sync.run();
    expect(await stored<{ dish: string }>("plans", "p-9")).toMatchObject({
      dish: "chole",
    });
    expect(announced).toEqual([]);
  });

  test("a deleted record arrives as deleted, and the reader hides it", async () => {
    server.put("plans", {
      id: "p-9",
      version: 1,
      updatedAt: T0,
      deletedAt: null,
      on: "2026-10-22",
      slot: "lunch",
      dish: "chole",
      prep: null,
    });
    await sync.run();
    expect(await plans.reader.all()).toHaveLength(1);
    server.put("plans", {
      id: "p-9",
      version: 2,
      updatedAt: T0,
      deletedAt: T0,
      on: "2026-10-22",
      slot: "lunch",
      dish: "chole",
      prep: null,
    });
    await sync.run();
    expect(await plans.reader.all()).toHaveLength(0);
  });

  test("pages until there are no more; the cursor is kept, and a new sync resumes from it", async () => {
    server.page = 2;
    for (let i = 0; i < 5; i++)
      server.put("plans", {
        id: `p-${String(i)}`,
        version: 1,
        updatedAt: T0,
        deletedAt: null,
      });
    await sync.run();
    expect(server.pulls).toEqual([0, 2, 4]);
    expect(sync.cursor()).toBe(5);
    expect(kv.get(SYNC_KEY)).toContain('"cursor":5');
    build();
    expect(sync.cursor()).toBe(5);
    await sync.run();
    expect(server.pulls.at(-1)).toBe(5);
  });

  test("a stale cursor starts over: every record, newer wins, the cursor moves on", async () => {
    server.put("plans", {
      id: "p-1",
      version: 1,
      updatedAt: T0,
      deletedAt: null,
    });
    await sync.run();
    server.put("plans", {
      id: "p-1",
      version: 3,
      updatedAt: T0,
      deletedAt: null,
    });
    server.put("plans", {
      id: "p-2",
      version: 1,
      updatedAt: T0,
      deletedAt: null,
    });
    server.purge(3);
    await sync.run();
    expect(await stored<object>("plans", "p-1")).toMatchObject({ version: 3 });
    expect(await stored<object>("plans", "p-2")).toMatchObject({ version: 1 });
    expect(sync.cursor()).toBe(3);
  });

  test("a change pulled for a record still pending: the newer version wins, the older is dropped", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    const id = (await plans.reader.all())[0]?.id ?? "";
    server.put("plans", {
      ...(await stored<object>("plans", id)),
      dish: "theirs",
      version: 4,
    } as PushedRecord["record"]);
    await sync.run();
    expect(await stored<{ dish: string }>("plans", id)).toMatchObject({
      dish: "theirs",
      version: 4,
    });
    expect(sync.pending()).toBe(0);
  });
});
