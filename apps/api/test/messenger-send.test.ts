import { beforeEach, describe, expect, test } from "bun:test";
import { cancel, send } from "../src/messenger/send.js";
import { webhook } from "../src/messenger/webhook.js";
import { WORDS } from "../src/messenger/words.js";
import { incoming, linked } from "./messenger-flow.js";
import { ask, type Harness, harness, T0 } from "./messenger-support.js";

// specs/207, criteria 12, 15 and 16: sending now and later, what the cook
// sends back, and what the log line says.

let h: Harness;
beforeEach(() => {
  h = harness();
});

const minutes = (n: number) => Date.parse(T0) + n * 60_000;
const post = (body: unknown, token?: string) =>
  send(ask("POST", "/api/messenger/send", body, token), h.deps);
const sentId = async (body: unknown, token: string) =>
  ((await (await post(body, token)).json()) as { id: string }).id;

describe("12. sending, now and later", () => {
  test("202, the text reaches the chat after the drain, with the context kept", async () => {
    const made = await linked(h);
    const response = await post(
      { text: "Tomorrow\nLunch: Chole", context: { plan: "2026-10-21" } },
      made.token,
    );
    expect(response.status).toBe(202);
    const { id } = (await response.json()) as { id: string };
    await h.settle();
    expect(h.channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: "Tomorrow\nLunch: Chole" },
    ]);
    expect(await h.store.message(id)).toMatchObject({
      status: "sent",
      context: { plan: "2026-10-21" },
    });
  });

  test("with `at`, it waits; the same context again replaces it", async () => {
    const made = await linked(h);
    const at = new Date(minutes(120)).toISOString();
    const first = await sentId(
      { text: "v1", at, context: "plan:d1" },
      made.token,
    );
    await h.settle();
    expect(h.channel.deliveries).toEqual([]);
    await sentId({ text: "v2", at, context: "plan:d1" }, made.token);
    await h.settle();
    expect((await h.store.message(first))?.status).toBe("cancelled");
    h.clock.now = minutes(120);
    await h.deps.messenger.drain();
    expect(h.channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: "v2" },
    ]);
  });

  test("no token: 401; an unknown one: 404; too long: 413; the 21st today: 429", async () => {
    const made = await linked(h);
    expect((await post({ text: "x" })).status).toBe(401);
    expect((await post({ text: "x" }, "unknown-token")).status).toBe(404);
    expect((await post({ text: "x".repeat(2001) }, made.token)).status).toBe(
      413,
    );
    expect((await post({ text: " " }, made.token)).status).toBe(400);
    for (let i = 0; i < 20; i++)
      expect((await post({ text: "x" }, made.token)).status).toBe(202);
    expect((await post({ text: "x" }, made.token)).status).toBe(429);
    await h.settle();
    expect(h.channel.deliveries).toHaveLength(20);
  });

  test("a scheduled message can be cancelled; a sent one can't", async () => {
    const made = await linked(h);
    const at = new Date(minutes(60)).toISOString();
    const later = await sentId({ text: "later", at }, made.token);
    const now = await sentId({ text: "now" }, made.token);
    await h.settle();
    const drop = (id: string) =>
      cancel(
        ask("DELETE", `/api/messenger/send/${id}`, undefined, made.token),
        h.deps,
      );
    expect((await drop(later)).status).toBe(204);
    expect((await drop(now)).status).toBe(409);
    expect((await drop("nope")).status).toBe(404);
    h.clock.now = minutes(60);
    await h.deps.messenger.drain();
    expect(h.channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: "now" },
    ]);
  });
});

describe("15. anything else is kept, and answered once", () => {
  test.each([
    ["a text", { kind: "text", text: "thanks!" }],
    ["a photo", { kind: "photo", ref: "file-7", caption: null }],
    ["a button", { kind: "button", value: "made", answers: null }],
  ] as const)("%s from the cook", async (_, event) => {
    await linked(h);
    const u = h.channel.update({
      id: `u-${event.kind}`,
      chat: "chat-1",
      event,
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    const c = await h.store.find("fake", "chat-1");
    const rows = await h.store.messages(c?.id ?? "");
    expect(rows.filter((r) => r.direction === "in").map((r) => r.kind)).toEqual(
      [event.kind],
    );
    expect(h.channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: WORDS.cantRead },
    ]);
    expect(h.logged.at(-1)).toMatchObject({
      kind: event.kind,
      outcome: "kept",
    });
  });

  test("a stranger gets the same line, and nothing is kept", async () => {
    const u = h.channel.update({
      id: "u6",
      chat: "who",
      event: { kind: "text", text: "hello?" },
    });
    await webhook(incoming(u), h.deps);
    expect(h.channel.deliveries).toEqual([
      {
        chat: "who",
        message: { kind: "text", text: WORDS.cantRead },
        edits: undefined,
      },
    ]);
    expect(await h.store.find("fake", "who")).toBeNull();
  });
});

describe("16. what the log says", () => {
  test("kinds, ids and counts, never text", async () => {
    const made = await linked(h);
    await post({ text: "Lunch: Chole" }, made.token);
    const u = h.channel.update({
      id: "u7",
      chat: "chat-1",
      event: { kind: "text", text: "a secret word" },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    const lines = JSON.stringify(h.logged);
    expect(lines).not.toContain("Chole");
    expect(lines).not.toContain("secret word");
    expect(lines).not.toContain(made.token);
    expect(h.logged.map((l) => l.route)).toContain("messenger/telegram");
  });
});
