import { describe, expect, test } from "bun:test";
import {
  type Api,
  createSettings,
  memoryKeyValue,
  type SendRequest,
} from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import {
  connectCook,
  cookConnected,
  disconnectCook,
  scheduleTomorrow,
  sendTomorrow,
} from "../src/cook.js";

// specs/207, the use cases: connect, poll, send now, schedule for 9 pm,
// disconnect, and what happens when the API says the cook is gone.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

const T0 = "2026-10-20T11:00:00.000Z";
const MADE = {
  code: "KM7Q4HTX",
  token: "tok",
  expiresAt: "2026-10-20T11:10:00.000Z",
};
const COOK = { token: "tok", connectedAt: T0, sent: null, scheduled: null };
const PLAN = { on: "2026-10-21", text: "Tomorrow\nLunch: Chole" };

/** A fake API that answers as told and remembers what was asked. */
function api(answers: Partial<Api> = {}) {
  const sent: { token: string; request: SendRequest }[] = [];
  const cancelled: string[] = [];
  const unlinked: string[] = [];
  let n = 0;
  const a: Api = {
    makeLink: () => Promise.resolve(MADE),
    linkState: () => Promise.resolve("waiting"),
    unlink: (token) => {
      unlinked.push(token);
      return Promise.resolve();
    },
    send: (token, request) => {
      sent.push({ token, request });
      return Promise.resolve({ id: `m-${String(++n)}` });
    },
    cancel: (_, id) => {
      cancelled.push(id);
      return Promise.resolve();
    },
    ...answers,
  };
  return { api: a, sent, cancelled, unlinked };
}

const settings = () => createSettings(memoryKeyValue(), options);
const refuse = (status: number, code: string) => () =>
  Promise.reject(new ApiError(status, code));

describe("connecting the cook", () => {
  test("connect asks for a link; polling saves the cook once she's connected", async () => {
    const s = settings();
    const { api: a } = api({ linkState: () => Promise.resolve("connected") });
    expect(await connectCook({ api: a })).toEqual(MADE);
    const d = { api: a, settings: s.writer };
    expect(await cookConnected(d, MADE, "2026-10-20T11:01:00.000Z")).toBe(
      "connected",
    );
    expect(s.store.getState().cook).toEqual({
      token: "tok",
      connectedAt: "2026-10-20T11:01:00.000Z",
      sent: null,
      scheduled: null,
    });
  });

  test("still waiting saves nothing; past ten minutes it's expired without asking", async () => {
    const s = settings();
    const d = { api: api().api, settings: s.writer };
    expect(await cookConnected(d, MADE, "2026-10-20T11:05:00.000Z")).toBe(
      "waiting",
    );
    expect(s.store.getState().cook).toBeNull();
    const never = api({
      linkState: () => Promise.reject(new Error("shouldn't ask")),
    });
    const n = { api: never.api, settings: s.writer };
    expect(await cookConnected(n, MADE, "2026-10-20T11:10:00.000Z")).toBe(
      "expired",
    );
  });

  test("disconnect tells the API and forgets everything, even if the API is down", async () => {
    const s = settings();
    s.writer.setCook({ ...COOK, sent: { ...PLAN, at: T0, id: null } });
    const { api: a, unlinked } = api({ unlink: refuse(0, "network") });
    await disconnectCook({ api: a, settings: s.writer }, COOK);
    expect(unlinked).toEqual([]);
    expect(s.store.getState().cook).toBeNull();
  });
});

describe("sending tomorrow", () => {
  test("now: the text with the day's context, and the plan is remembered as sent", async () => {
    const s = settings();
    s.writer.setCook(COOK);
    const { api: a, sent } = api();
    expect(
      await sendTomorrow({ api: a, settings: s.writer }, COOK, PLAN, T0),
    ).toBe("sent");
    expect(sent).toEqual([
      {
        token: "tok",
        request: { text: PLAN.text, context: "plan:2026-10-21" },
      },
    ]);
    expect(s.store.getState().cook?.sent).toEqual({
      ...PLAN,
      at: T0,
      id: null,
    });
  });

  test("a plan waiting for 9 pm is cancelled first, and forgotten", async () => {
    const s = settings();
    const cook = {
      ...COOK,
      scheduled: { ...PLAN, at: "2026-10-20T13:00:00.000Z", id: "m-9" },
    };
    s.writer.setCook(cook);
    const { api: a, cancelled } = api();
    await sendTomorrow({ api: a, settings: s.writer }, cook, PLAN, T0);
    expect(cancelled).toEqual(["m-9"]);
    expect(s.store.getState().cook?.scheduled).toBeNull();
  });

  test("scheduling: `at` and the context go along, and the id is kept", async () => {
    const s = settings();
    s.writer.setCook(COOK);
    const { api: a, sent } = api();
    const at = "2026-10-20T13:00:00.000Z";
    expect(
      await scheduleTomorrow({ api: a, settings: s.writer }, COOK, PLAN, at),
    ).toBe("sent");
    expect(sent[0]?.request).toEqual({
      text: PLAN.text,
      at,
      context: "plan:2026-10-21",
    });
    expect(s.store.getState().cook?.scheduled).toEqual({
      ...PLAN,
      at,
      id: "m-1",
    });
  });

  test("the cook has left: 404 means gone, and the phone forgets her", async () => {
    const s = settings();
    s.writer.setCook(COOK);
    const { api: a } = api({ send: refuse(404, "gone") });
    expect(
      await sendTomorrow({ api: a, settings: s.writer }, COOK, PLAN, T0),
    ).toBe("gone");
    expect(s.store.getState().cook).toBeNull();
  });

  test("no network: failed, and nothing changes", async () => {
    const s = settings();
    s.writer.setCook(COOK);
    const { api: a } = api({ send: refuse(0, "network") });
    expect(
      await sendTomorrow({ api: a, settings: s.writer }, COOK, PLAN, T0),
    ).toBe("failed");
    expect(s.store.getState().cook).toEqual(COOK);
  });
});
