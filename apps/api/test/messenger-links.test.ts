import { beforeEach, describe, expect, test } from "bun:test";
import { linkStatus, makeLink, unlink } from "../src/messenger/links.js";
import { send } from "../src/messenger/send.js";
import { webhook } from "../src/messenger/webhook.js";
import { WORDS } from "../src/messenger/words.js";
import { incoming, linked } from "./messenger-flow.js";
import { ask, type Harness, harness, T0 } from "./messenger-support.js";

// specs/207, criteria 9, 10, 11 and 14: a link is made, the cook connects
// once, the webhook's secret and repeats, and stopping from either side.

let h: Harness;
beforeEach(() => {
  h = harness();
});

const minutes = (n: number) => Date.parse(T0) + n * 60_000;
const status = (code: string, token: string) =>
  linkStatus(
    ask("GET", `/api/messenger/links/${code}`, undefined, token),
    h.deps,
  );

describe("9. a link is made", () => {
  test("201 with a readable code, the token once, and when it runs out", async () => {
    const response = await makeLink(
      ask("POST", "/api/messenger/links"),
      h.deps,
    );
    expect(response.status).toBe(201);
    const made = (await response.json()) as Record<string, string>;
    expect(made.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(made.token).toBeString();
    expect(made.expiresAt).toBe(new Date(minutes(10)).toISOString());
    expect(
      await (await status(made.code ?? "", made.token ?? "")).json(),
    ).toEqual({
      state: "waiting",
    });
  });

  test("the eleventh link from one address in a day is refused", async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (await makeLink(ask("POST", "/api/messenger/links"), h.deps)).status,
      ).toBe(201);
    expect(
      (await makeLink(ask("POST", "/api/messenger/links"), h.deps)).status,
    ).toBe(429);
  });

  test("status without a token is 401", async () => {
    const response = await linkStatus(
      ask("GET", "/api/messenger/links/KM7Q4HTX"),
      h.deps,
    );
    expect(response.status).toBe(401);
  });
});

describe("10. the cook connects, once", () => {
  test("Start with the code opens the conversation, replies, and the phone sees connected", async () => {
    const made = await linked(h, false);
    const u = h.channel.update({
      id: "u1",
      chat: "chat-1",
      event: { kind: "started", code: made.code },
    });
    expect((await webhook(incoming(u), h.deps)).status).toBe(200);
    await h.settle();
    const c = await h.store.find("fake", "chat-1");
    expect(c).toMatchObject({ owner: { kind: "link" } });
    expect(h.channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: WORDS.connected },
    ]);
    const rows = await h.store.messages(c?.id ?? "");
    expect(rows.map((m) => [m.direction, m.status])).toEqual([["out", "sent"]]);
    expect(await (await status(made.code, made.token)).json()).toEqual({
      state: "connected",
    });
  });

  test("the same code again, from anywhere, didn't work; nothing else changes", async () => {
    const made = await linked(h);
    const u = h.channel.update({
      id: "u2",
      chat: "chat-9",
      event: { kind: "started", code: made.code },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    expect(h.channel.deliveries).toEqual([
      {
        chat: "chat-9",
        message: { kind: "text", text: WORDS.badCode },
        edits: undefined,
      },
    ]);
    expect(await h.store.find("fake", "chat-9")).toBeNull();
    expect(h.logged.at(-1)).toMatchObject({
      route: "messenger/telegram",
      kind: "started",
      outcome: "bad-code",
    });
  });
});

describe("11. the webhook secret, and an update seen twice", () => {
  test("no secret, or a wrong one: 401, nothing stored, nothing sent", async () => {
    const body = JSON.stringify({
      id: "u3",
      chat: "chat-1",
      event: { kind: "stopped" },
    });
    const wrong = new Request("https://cookto.day/api/messenger/telegram", {
      method: "POST",
      body,
      headers: { "x-fake-secret": "nope" },
    });
    expect((await webhook(wrong, h.deps)).status).toBe(401);
    const none = new Request("https://cookto.day/api/messenger/telegram", {
      method: "POST",
      body,
    });
    expect((await webhook(none, h.deps)).status).toBe(401);
    expect(h.channel.deliveries).toEqual([]);
    expect(h.logged.at(-1)).toMatchObject({ status: 401, error: "secret" });
  });

  test("the same update twice: one message row, one reply", async () => {
    await linked(h);
    const u = h.channel.update({
      id: "u4",
      chat: "chat-1",
      event: { kind: "text", text: "ok" },
    });
    await webhook(incoming(u), h.deps);
    await webhook(incoming(u), h.deps);
    await h.settle();
    const c = await h.store.find("fake", "chat-1");
    const rows = await h.store.messages(c?.id ?? "");
    expect(rows.filter((r) => r.direction === "in")).toHaveLength(1);
    expect(h.channel.deliveries).toHaveLength(1);
    expect(h.logged.at(-1)).toMatchObject({ outcome: "duplicate" });
  });
});

describe("14. stop", () => {
  test("/stop: the goodbye, then the conversation, its messages and the link are gone", async () => {
    const made = await linked(h);
    await send(
      ask("POST", "/api/messenger/send", { text: "hi" }, made.token),
      h.deps,
    );
    await h.settle();
    const u = h.channel.update({
      id: "u5",
      chat: "chat-1",
      event: { kind: "stopped" },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    expect(h.channel.deliveries.at(-1)?.message).toEqual({
      kind: "text",
      text: WORDS.stopped,
    });
    expect(await h.store.find("fake", "chat-1")).toBeNull();
    const again = await send(
      ask("POST", "/api/messenger/send", { text: "again" }, made.token),
      h.deps,
    );
    expect(again.status).toBe(404);
    expect(await (await status(made.code, made.token)).json()).toEqual({
      state: "gone",
    });
    expect(h.logged.at(-1)).toMatchObject({
      kind: "stopped",
      outcome: "stopped",
    });
  });

  test("the planner's Disconnect does the same, and a second one is 404", async () => {
    const made = await linked(h);
    const off = ask("DELETE", "/api/messenger/links", undefined, made.token);
    expect((await unlink(off, h.deps)).status).toBe(204);
    expect(await h.store.find("fake", "chat-1")).toBeNull();
    expect((await unlink(off, h.deps)).status).toBe(404);
  });
});
