import { describe, expect, test } from "bun:test";
import {
  createChanges,
  createSettings,
  type HouseholdApi,
  memoryKeyValue,
  memoryRecordStore,
  type PushedRecord,
  type SyncApi,
} from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import { createSync } from "@cookto/data/sync";
import { joinOrStart } from "../src/household-sync.js";

// specs/217, criterion 1's cook part: the cook's link this phone held goes
// with the records when the household is made; the phone keeps her, with
// no token of its own, and sends through the session from then on.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};
const T0 = "2026-10-20T11:00:00.000Z";

function server() {
  const created: { records: PushedRecord[]; cookToken?: string }[] = [];
  let has = false;
  const api: HouseholdApi & SyncApi = {
    household: () =>
      has
        ? Promise.resolve({
            id: "home-1",
            members: [
              {
                id: "m-1",
                role: "plan",
                kind: "account",
                name: "Mayur",
                stopped: false,
              },
              {
                id: "m-2",
                role: "cook",
                kind: "telegram",
                name: null,
                stopped: false,
              },
            ],
          })
        : Promise.reject(new ApiError(404, "no-household")),
    createHousehold: (records, cookToken) => {
      created.push(
        cookToken === undefined ? { records } : { records, cookToken },
      );
      has = true;
      return Promise.resolve({ id: "home-1" });
    },
    invite: () => Promise.resolve({ code: "KM7Q4HTX", expiresAt: "x" }),
    removeMember: () => Promise.resolve(),
    deleteAccount: () => Promise.resolve(),
    push: () => Promise.resolve({ refused: [] }),
    changes: (after) =>
      Promise.resolve({
        changes: [],
        cursor: after,
        more: false,
        reset: false,
      }),
  };
  return { api, created };
}

function phone(s: ReturnType<typeof server>) {
  const store = memoryRecordStore();
  const changes = createChanges();
  const settings = createSettings(memoryKeyValue(), options);
  settings.writer.setSignedIn({ name: "Mayur", at: T0 });
  const sync = createSync({ store, api: s.api, kv: memoryKeyValue(), changes });
  return {
    settings,
    deps: { api: s.api, store, sync, settings: settings.writer, changes },
  };
}

describe("the cook goes with the household", () => {
  test("starting one: her token is handed over, and this phone keeps her without it", async () => {
    const s = server();
    const { settings, deps } = phone(s);
    const sent = { on: "2026-10-21", text: "Tomorrow", at: T0, id: null };
    settings.writer.setCook({
      token: "tok",
      connectedAt: T0,
      sent,
      scheduled: null,
    });
    expect(await joinOrStart(deps)).toBe("started");
    expect(s.created[0]?.cookToken).toBe("tok");
    // With no cook held, nothing is handed over.
    const bare = server();
    const other = phone(bare);
    expect(await joinOrStart(other.deps)).toBe("started");
    expect(bare.created[0]).toEqual({ records: [] });
    expect(other.settings.store.getState().cook).toBeNull();
    expect(settings.store.getState().cook).toEqual({
      token: null,
      connectedAt: T0,
      sent,
      scheduled: null,
    });
  });

  test("joining one that has a cook: she's connected through it", async () => {
    const s = server();
    await s.api.createHousehold([]);
    const { settings, deps } = phone(s);
    expect(await joinOrStart(deps)).toBe("joined");
    expect(settings.store.getState().cook).toMatchObject({ token: null });
  });
});
