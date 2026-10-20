import { beforeEach, describe, expect, test } from "bun:test";
import {
  createChanges,
  createPlans,
  createSettings,
  type HouseholdApi,
  memoryKeyValue,
  memoryRecordStore,
  type PushedRecord,
  type Sync,
  type SyncApi,
} from "@cookto/data";
import { createSync } from "@cookto/data/sync";
import { ApiError } from "@cookto/data/network";
import {
  deleteAccount,
  joinOrStart,
  leaveHousehold,
  phoneHasOwnKitchen,
  replaceWithHousehold,
  syncNow,
} from "../src/household-sync.js";

// specs/217, the use cases around the household: signing in starts one from
// the phone's records or joins the one the account has, replacing this
// phone's kitchen when it had one of its own; leaving; deleting the
// account; a sync that finds the session gone.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};
const T0 = "2026-10-20T19:00:00.000Z";
const VIEW = {
  id: "home-1",
  members: [
    {
      id: "m-1",
      role: "plan" as const,
      kind: "account" as const,
      name: "Mayur",
      stopped: false,
    },
  ],
};

/** A server with a household, or none; records whole; a changes log. */
function server(hasHousehold: boolean) {
  const records = new Map<string, PushedRecord>();
  const log: {
    seq: number;
    collection: string;
    record: PushedRecord["record"];
  }[] = [];
  const asked: string[] = [];
  let seq = 0;
  const put = (r: PushedRecord) => {
    records.set(`${r.collection}/${r.record.id}`, r);
    log.push({ seq: ++seq, collection: r.collection, record: r.record });
  };
  const fail: { error: ApiError | null } = { error: null };
  const guard = () => {
    if (fail.error) return Promise.reject(fail.error);
    return Promise.resolve();
  };
  const api: HouseholdApi & SyncApi = {
    household: async () => {
      await guard();
      asked.push("household");
      if (!hasHousehold) throw new ApiError(404, "no-household");
      return VIEW;
    },
    createHousehold: async (pushed) => {
      await guard();
      asked.push("create");
      hasHousehold = true;
      for (const r of pushed) put(r);
      return { id: "home-1" };
    },
    invite: () => Promise.resolve({ code: "KM7Q4HTX", expiresAt: "x" }),
    removeMember: (id) => {
      asked.push(`remove:${id}`);
      return Promise.resolve();
    },
    deleteAccount: () => {
      asked.push("delete");
      return Promise.resolve();
    },
    push: async (pushed) => {
      await guard();
      for (const r of pushed) put(r);
      return { refused: [] };
    },
    changes: async (after) => {
      await guard();
      const mine = log.filter((c) => c.seq > after);
      return {
        changes: mine,
        cursor: mine.at(-1)?.seq ?? after,
        more: false,
        reset: false,
      };
    },
  };
  return { api, records, asked, fail, put };
}

let announced: string[];
let sync: Sync;
let plans: ReturnType<typeof createPlans>;
let settings: ReturnType<typeof createSettings>;
let store: ReturnType<typeof memoryRecordStore>;
let changes: ReturnType<typeof createChanges>;

function build(s: ReturnType<typeof server>) {
  store = memoryRecordStore();
  changes = createChanges();
  announced = [];
  changes.subscribe((topic) => announced.push(topic));
  settings = createSettings(memoryKeyValue(), options);
  settings.writer.setSignedIn({ name: "Mayur", at: T0 });
  sync = createSync({ store, api: s.api, kv: memoryKeyValue(), changes });
  plans = createPlans(sync.store, { changes, now: () => T0 });
  return {
    api: s.api,
    store,
    sync,
    settings: settings.writer,
    changes,
  };
}

beforeEach(() => {
  announced = [];
});

describe("signing in starts the household, or joins it", () => {
  test("no household yet: made from every record this phone has, whole; then in sync", async () => {
    const s = server(false);
    const d = build(s);
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    expect(await joinOrStart(d)).toBe("started");
    expect(s.asked).toEqual(["household", "create"]);
    expect([...s.records.values()].map((r) => r.collection)).toEqual(["plans"]);
    expect([...s.records.values()][0]?.record).toMatchObject({
      dish: "paneer",
      version: 1,
    });
    expect(sync.pending()).toBe(0);
    expect(sync.cursor()).toBe(1);
  });

  test("a household, and this phone has its own kitchen: ask, and change nothing", async () => {
    const s = server(true);
    const d = build(s);
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    expect(await phoneHasOwnKitchen(d)).toBe(true);
    expect(await joinOrStart(d)).toBe("ask");
    expect(s.asked).toEqual(["household"]);
    expect(await plans.reader.all()).toHaveLength(1);
  });

  test("a household, and only an untouched sample here: the household's kitchen replaces it", async () => {
    const s = server(true);
    const d = build(s);
    s.put({
      collection: "plans",
      record: {
        id: "p-theirs",
        version: 1,
        updatedAt: T0,
        deletedAt: null,
        on: "2026-10-21",
        slot: "lunch",
        dish: "chole",
        prep: null,
      },
    });
    settings.writer.setKitchen({
      cuisines: ["north-indian"],
      skip: [],
      sample: { addedCuisines: ["north-indian"] },
    });
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    expect(await phoneHasOwnKitchen(d)).toBe(false);
    expect(await joinOrStart(d)).toBe("joined");
    expect((await plans.reader.all()).map((p) => p.dish)).toEqual(["chole"]);
  });

  test("an empty phone joins without a question", async () => {
    const s = server(true);
    const d = build(s);
    expect(await phoneHasOwnKitchen(d)).toBe(false);
    expect(await joinOrStart(d)).toBe("joined");
  });

  test("offline, or signed out elsewhere", async () => {
    const s = server(true);
    const d = build(s);
    s.fail.error = new ApiError(0, "network");
    expect(await joinOrStart(d)).toBe("offline");
    s.fail.error = new ApiError(401, "session");
    expect(await joinOrStart(d)).toBe("signed-out");
    expect(settings.store.getState().signedIn).toBeNull();
  });
});

describe("replacing this phone's kitchen", () => {
  test("every collection is cleared and announced; the household's records are pulled", async () => {
    const s = server(true);
    const d = build(s);
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    await sync.run();
    s.put({
      collection: "plans",
      record: {
        id: "p-theirs",
        version: 1,
        updatedAt: T0,
        deletedAt: null,
        on: "2026-10-22",
        slot: "lunch",
        dish: "chole",
        prep: null,
      },
    });
    announced.length = 0;
    await replaceWithHousehold(d);
    expect(announced).toContain("plans");
    expect(announced).toContain("pantry");
    const dishes = (await plans.reader.all()).map((p) => p.dish).sort();
    expect(dishes).toEqual(["chole", "paneer"]);
    expect(sync.pending()).toBe(0);
  });
});

describe("leaving, and deleting the account", () => {
  test("leave: the membership ends, the phone's copy is cleared, and sync starts over", async () => {
    const s = server(true);
    const d = build(s);
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    await sync.run();
    await leaveHousehold(d, "m-1");
    expect(s.asked).toContain("remove:m-1");
    expect(await plans.reader.all()).toEqual([]);
    expect(announced).toContain("plans");
    expect(sync.cursor()).toBe(0);
    expect(sync.pending()).toBe(0);
    expect(settings.store.getState().signedIn).not.toBeNull();
  });

  test("delete my account: the API is told, this phone forgets the name and keeps its kitchen", async () => {
    const s = server(true);
    const d = build(s);
    await plans.writer.plan("2026-10-21", "dinner", "paneer");
    await sync.run();
    await deleteAccount(d);
    expect(s.asked).toContain("delete");
    expect(settings.store.getState().signedIn).toBeNull();
    expect(await plans.reader.all()).toHaveLength(1);
    expect(sync.cursor()).toBe(0);
  });
});

describe("a sync that finds the session gone", () => {
  test("signed out elsewhere: the phone forgets the name", async () => {
    const s = server(true);
    const d = build(s);
    expect(await syncNow(d)).toBe("synced");
    s.fail.error = new ApiError(401, "session");
    expect(await syncNow(d)).toBe("signed-out");
    expect(settings.store.getState().signedIn).toBeNull();
  });
});
