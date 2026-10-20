import { beforeEach, describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { memoryKeyValue } from "../src/kv.js";
import { ApiError, type PushedRecord } from "../src/network.js";
import { createPlans } from "../src/plans.js";
import { memoryRecordStore } from "../src/record-store.js";
import type { SyncRecord } from "../src/records.js";
import { createSync, SYNC_KEY, type Sync } from "../src/sync.js";
import { type FakeServer, fakeServer } from "./sync-server.js";

// specs/217, the phone's half of sync (ADR 0033): every write through the
// repositories is pending until pushed; a push sends the records whole and
// the newer version wins; a pull applies the changes after the cursor,
// through the same store, and announces them; one sync at a time.

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
const ids = (records: { record: { id: string } }[]) =>
  records.map((r) => r.record.id);

describe("push", () => {
  test("a write is pending; a sync pushes it whole, with its collection; then nothing is", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    expect(sync.pending()).toBe(1);
    expect(await sync.run()).toBe("synced");
    expect(sync.pending()).toBe(0);
    const [pushed] = server.pushes;
    expect(pushed).toHaveLength(1);
    expect(pushed?.[0]?.collection).toBe("plans");
    expect(pushed?.[0]?.record).toMatchObject({
      on: "2026-10-21",
      slot: "dinner",
      dish: "paneer",
      version: 1,
      deletedAt: null,
    });
    expect(server.records.size).toBe(1);
    await sync.run();
    expect(server.pushes).toHaveLength(1);
  });

  test("a record refused comes back as the server's copy, saved and announced", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    await sync.run();
    const id = ids(server.pushes[0] ?? [])[0] ?? "";
    const theirs = {
      ...(await stored<object>("plans", id)),
      dish: "dal",
      version: 5,
    };
    server.put("plans", theirs as PushedRecord["record"]);
    await plans.writer.swap("2026-10-21", "dinner", "bhindi");
    announced.length = 0;
    expect(await sync.run()).toBe("synced");
    expect(await stored<{ dish: string }>("plans", id)).toMatchObject({
      dish: "dal",
      version: 5,
    });
    expect(announced).toContain("plans");
    expect(sync.pending()).toBe(0);
  });

  test("a write during a push stays pending for the next one", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    const release = server.hold();
    const running = sync.run();
    await plans.writer.swap("2026-10-21", "dinner", "dal");
    release();
    await running;
    expect(sync.pending()).toBe(1);
    await sync.run();
    expect(sync.pending()).toBe(0);
    const id = ids(server.pushes[0] ?? [])[0] ?? "";
    expect(server.records.get(`plans/${id}`)?.record).toMatchObject({
      dish: "dal",
      version: 2,
    });
  });
});

describe("one at a time", () => {
  test("a new sync cancels the one in flight, and the cancelled one changes nothing", async () => {
    server.put("plans", {
      id: "p-1",
      version: 1,
      updatedAt: T0,
      deletedAt: null,
    });
    const release = server.hold();
    const first = sync.run();
    const second = sync.run();
    release();
    expect(await first).toBe("cancelled");
    expect(await second).toBe("synced");
    expect(server.pulls).toEqual([0, 0]);
    expect(await stored<object>("plans", "p-1")).not.toBeNull();
    expect(announced).toEqual(["plans"]);
  });

  test("soon: writes in a row make one push after the pause", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    sync.soon();
    await plans.writer.plan("2026-10-21", "lunch", "dal");
    sync.soon();
    expect(timers).toHaveLength(1);
    expect(timers[0]?.ms).toBe(2_000);
    timers[0]?.fn();
    await sync.idle();
    expect(server.pushes).toHaveLength(1);
    expect(server.pushes[0]).toHaveLength(2);
  });
});

describe("what a sync comes to", () => {
  test("offline, signed out, no household, or something else; nothing lost", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    server.fail(new ApiError(0, "network"));
    expect(await sync.run()).toBe("offline");
    server.fail(new ApiError(401, "session"));
    expect(await sync.run()).toBe("signed-out");
    server.fail(new ApiError(403, "no-household"));
    expect(await sync.run()).toBe("no-household");
    server.fail(new ApiError(500, "error"));
    expect(await sync.run()).toBe("failed");
    expect(sync.pending()).toBe(1);
    expect(await sync.run()).toBe("synced");
    expect(sync.pending()).toBe(0);
  });

  test("reset forgets the cursor and what was pending", async () => {
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    server.put("plans", {
      id: "p-1",
      version: 1,
      updatedAt: T0,
      deletedAt: null,
    });
    await sync.run();
    expect(sync.cursor()).toBeGreaterThan(0);
    await plans.writer.plan("2026-10-22", "dinner", "dal");
    sync.reset();
    expect(sync.cursor()).toBe(0);
    expect(sync.pending()).toBe(0);
    expect(JSON.parse(kv.get(SYNC_KEY) ?? "")).toEqual({
      cursor: 0,
      pending: [],
    });
  });
});
