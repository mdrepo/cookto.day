import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { memoryKeyValue } from "../src/kv.js";
import { createPlans } from "../src/plans.js";
import { memoryRecordStore, type RecordStore } from "../src/record-store.js";
import { created, type SyncRecord } from "../src/records.js";
import { createSync } from "../src/sync.js";
import { fakeServer, type FakeServer } from "./sync-server.js";

// specs/236: a plan's id is made from its day, meal and who it's for, so two
// phones, or a phone and the server, saving the same meal write one record;
// plans saved before keep their random ids, the reader shows the newest of
// a meal's, and its next change lands on the one id and deletes the rest.

const T0 = "2026-10-21T19:00:00.000Z";

function phone(store: RecordStore = memoryRecordStore(), now = () => T0) {
  return {
    store,
    plans: createPlans(store, { changes: createChanges(), now }),
  };
}

function synced(server: FakeServer) {
  const changes = createChanges();
  const sync = createSync({
    store: memoryRecordStore(),
    api: server,
    kv: memoryKeyValue(),
    changes,
    pauseMs: 2_000,
    schedule: () => () => undefined,
  });
  return { sync, plans: createPlans(sync.store, { changes, now: () => T0 }) };
}

const dishes = async (p: ReturnType<typeof createPlans>) =>
  (await p.reader.all()).map((m) => [m.on, m.slot, m.dish, m.for ?? ""]);

describe("one plan for each meal", () => {
  test("the same meal, the same record: plan:{day}:{meal}, and :child beside it", async () => {
    const { store, plans } = phone();
    await plans.writer.plan("2026-10-22", "dinner", "rajma");
    await plans.writer.plan("2026-10-22", "dinner", "khichdi", "child");
    const ids = (await store.all<SyncRecord>("plans")).map((r) => r.id).sort();
    expect(ids).toEqual([
      "plan:2026-10-22:dinner",
      "plan:2026-10-22:dinner:child",
    ]);
  });

  test("two phones offline plan one dinner: the server holds one, and both show the same dish", async () => {
    const server = fakeServer();
    const a = synced(server);
    const b = synced(server);
    await a.plans.writer.plan("2026-10-22", "dinner", "rajma");
    await b.plans.writer.plan("2026-10-22", "dinner", "chole");
    await a.sync.run();
    await b.sync.run();
    await a.sync.run();
    const onServer = [...server.records.values()].filter(
      (r) => r.collection === "plans",
    );
    expect(onServer).toHaveLength(1);
    expect(await dishes(a.plans)).toEqual([
      ["2026-10-22", "dinner", "rajma", ""],
    ]);
    expect(await dishes(b.plans)).toEqual([
      ["2026-10-22", "dinner", "rajma", ""],
    ]);
  });

  test("plans saved before: the newer shows; a swap lands on the one id and deletes both", async () => {
    const store = memoryRecordStore();
    const older = created(
      { on: "2026-10-22", slot: "dinner", dish: "rajma", prep: null },
      "2026-10-21T10:00:00.000Z",
    );
    const newer = created(
      { on: "2026-10-22", slot: "dinner", dish: "chole", prep: null },
      "2026-10-21T11:00:00.000Z",
    );
    await store.put("plans", [older, newer]);
    const { plans } = phone(store, () => "2026-10-21T12:00:00.000Z");
    expect(await dishes(plans)).toEqual([
      ["2026-10-22", "dinner", "chole", ""],
    ]);

    await plans.writer.swap("2026-10-22", "dinner", "paneer");
    expect(await dishes(plans)).toEqual([
      ["2026-10-22", "dinner", "paneer", ""],
    ]);
    const all = await store.all<SyncRecord & { dish: string }>("plans");
    expect(all.find((r) => r.id === "plan:2026-10-22:dinner")).toMatchObject({
      dish: "paneer",
      deletedAt: null,
    });
    for (const old of [older, newer])
      expect(all.find((r) => r.id === old.id)?.deletedAt).not.toBeNull();
  });
});
