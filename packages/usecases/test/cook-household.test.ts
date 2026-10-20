import { describe, expect, test } from "bun:test";
import {
  type Api,
  createSettings,
  type HouseholdSendApi,
  type HouseholdView,
  memoryKeyValue,
  type SendRequest,
} from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import { scheduleTomorrow, sendTomorrow } from "../src/cook.js";
import { reflectCook } from "../src/household-sync.js";

// specs/217, the cook's move: once the cook belongs to the household, this
// phone sends through its session, with no token; the cook marker follows
// what the household says. A phone that never signed in keeps its link.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};
const T0 = "2026-10-20T11:00:00.000Z";
const PLAN = { on: "2026-10-21", text: "Tomorrow\nLunch: Chole" };
/** The cook through the household: no token of this phone's own. */
const OURS = { token: null, connectedAt: T0, sent: null, scheduled: null };

function api(answers: Partial<Api & HouseholdSendApi> = {}) {
  const sent: { token: string | null; request: SendRequest }[] = [];
  const cancelled: string[] = [];
  let n = 0;
  const a = {
    send: (token: string, request: SendRequest) => {
      sent.push({ token, request });
      return Promise.resolve({ id: `m-${String(++n)}` });
    },
    sendThroughHousehold: (request: SendRequest) => {
      sent.push({ token: null, request });
      return Promise.resolve({ id: `m-${String(++n)}` });
    },
    cancel: (_: string, id: string) => {
      cancelled.push(id);
      return Promise.resolve();
    },
    ...answers,
  } as Api & HouseholdSendApi;
  return { api: a, sent, cancelled };
}

const settings = () => createSettings(memoryKeyValue(), options);
const refuse = (status: number, code: string) => () =>
  Promise.reject(new ApiError(status, code));

const member = (
  role: "plan" | "cook",
  stopped = false,
): HouseholdView["members"][number] => ({
  id: `m-${role}`,
  role,
  kind: role === "cook" ? "telegram" : "account",
  name: role === "cook" ? null : "Mayur",
  stopped,
});

describe("sending through the household", () => {
  test("Looks good: no token, no cancel; the plan still waiting is replaced by the send", async () => {
    const s = settings();
    const { api: a, sent, cancelled } = api();
    const cook = { ...OURS, scheduled: { ...PLAN, at: "x", id: "m-9" } };
    const result = await sendTomorrow(
      { api: a, settings: s.writer },
      cook,
      PLAN,
      T0,
    );
    expect(result).toBe("sent");
    expect(sent).toEqual([
      { token: null, request: { text: PLAN.text, context: "plan:2026-10-21" } },
    ]);
    expect(cancelled).toEqual([]);
    expect(s.store.getState().cook).toMatchObject({
      token: null,
      sent: { ...PLAN, at: T0, id: null },
      scheduled: null,
    });
  });

  test("the 9 pm plan waits on the server through the session too", async () => {
    const s = settings();
    const { api: a, sent } = api();
    const at = "2026-10-21T13:00:00.000Z";
    const result = await scheduleTomorrow(
      { api: a, settings: s.writer },
      OURS,
      PLAN,
      at,
    );
    expect(result).toBe("sent");
    expect(sent[0]).toEqual({
      token: null,
      request: { text: PLAN.text, at, context: "plan:2026-10-21" },
    });
  });

  test("no cook in the household any more: this phone forgets her", async () => {
    for (const refused of [refuse(409, "no-cook"), refuse(404, "gone")]) {
      const s = settings();
      s.writer.setCook(OURS);
      const result = await sendTomorrow(
        { api: api({ sendThroughHousehold: refused }).api, settings: s.writer },
        OURS,
        PLAN,
        T0,
      );
      expect(result).toBe("gone");
      expect(s.store.getState().cook).toBeNull();
    }
  });

  test("a phone with its own link still sends with the token, cancelling first", async () => {
    const s = settings();
    const { api: a, sent, cancelled } = api();
    const cook = {
      token: "tok",
      connectedAt: T0,
      sent: null,
      scheduled: { ...PLAN, at: "x", id: "m-9" },
    };
    await sendTomorrow({ api: a, settings: s.writer }, cook, PLAN, T0);
    expect(cancelled).toEqual(["m-9"]);
    expect(sent[0]?.token).toBe("tok");
  });
});

describe("the cook marker follows the household", () => {
  test("a cook in the household, none on this phone: she's connected through it", () => {
    const s = settings();
    reflectCook(
      s.writer,
      s.store.getState().cook,
      [member("plan"), member("cook")],
      T0,
    );
    expect(s.store.getState().cook).toEqual(OURS);
  });

  test("already connected through the household: nothing changes", () => {
    const s = settings();
    const cook = { ...OURS, sent: { ...PLAN, at: T0, id: null } };
    s.writer.setCook(cook);
    reflectCook(s.writer, cook, [member("plan"), member("cook")], "later");
    expect(s.store.getState().cook).toEqual(cook);
  });

  test("the cook left or stopped: this phone forgets her", () => {
    const s = settings();
    s.writer.setCook(OURS);
    reflectCook(s.writer, OURS, [member("plan")], T0);
    expect(s.store.getState().cook).toBeNull();
    s.writer.setCook(OURS);
    reflectCook(s.writer, OURS, [member("plan"), member("cook", true)], T0);
    expect(s.store.getState().cook).toBeNull();
  });

  test("a phone's own link is left alone", () => {
    const s = settings();
    const own = { ...OURS, token: "tok" };
    s.writer.setCook(own);
    reflectCook(s.writer, own, [member("plan")], T0);
    expect(s.store.getState().cook).toEqual(own);
  });
});
