import { beforeEach, describe, expect, test } from "bun:test";
import { ChannelError } from "../src/channel.js";
import { fakeChannel, type FakeChannel } from "../src/fake.js";
import { memoryStore } from "../src/memory-store.js";
import { createMessenger, type Messenger } from "../src/messenger.js";
import type { Store } from "../src/store.js";

// specs/207, criteria 11 to 13 at the package's level (ADR 0031): send
// records and queues; receive verifies, dedupes and records; the drain sends
// safely. The API's tests add the routes and the links on top.

const T0 = "2026-10-20T19:00:00.000Z";
const minutes = (n: number) =>
  new Date(new Date(T0).getTime() + n * 60_000).toISOString();

let channel: FakeChannel;
let store: Store;
let clock: { now: string };
let m: Messenger;

beforeEach(() => {
  channel = fakeChannel();
  store = memoryStore();
  clock = { now: T0 };
  m = createMessenger({ channel, store, now: () => clock.now });
});

const open = () => store.open("fake", "chat-1", { kind: "link", id: "L1" }, T0);
/** Why a promise failed, or "ok" when it didn't. */
const failure = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) => (e instanceof Error ? e.message : String(e)),
  );

describe("send", () => {
  test("records a queued message with its context, and the drain sends it", async () => {
    const c = await open();
    const id = await m.send(
      c.id,
      { kind: "text", text: "Tomorrow" },
      { context: { plan: "d1" } },
    );
    expect(await store.message(id)).toMatchObject({
      status: "queued",
      context: { plan: "d1" },
      direction: "out",
    });
    expect(await m.drain()).toEqual([{ message: id, outcome: "sent" }]);
    expect(channel.deliveries).toEqual([
      {
        chat: "chat-1",
        message: { kind: "text", text: "Tomorrow" },
        edits: undefined,
      },
    ]);
    expect(await store.message(id)).toMatchObject({
      status: "sent",
      channelId: "f-1",
    });
    expect(await store.claim(minutes(1), minutes(2))).toEqual([]);
  });

  test("a message for later waits, then goes", async () => {
    const c = await open();
    const id = await m.send(
      c.id,
      { kind: "text", text: "later" },
      { at: minutes(60) },
    );
    expect(await m.drain()).toEqual([]);
    clock.now = minutes(60);
    expect(await m.drain()).toEqual([{ message: id, outcome: "sent" }]);
  });

  test("replacing: the one waiting with the same context is cancelled", async () => {
    const c = await open();
    const first = await m.send(
      c.id,
      { kind: "text", text: "v1" },
      { at: minutes(120), context: "plan:d1" },
    );
    const second = await m.send(
      c.id,
      { kind: "text", text: "v2" },
      { at: minutes(120), context: "plan:d1", replaces: true },
    );
    expect((await store.message(first))?.status).toBe("cancelled");
    clock.now = minutes(120);
    expect(await m.drain()).toEqual([{ message: second, outcome: "sent" }]);
    expect(channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: "v2" },
    ]);
  });

  test("an unknown conversation, or a kind the channel can't send", async () => {
    const c = await open();
    expect(await failure(m.send("nope", { kind: "text", text: "x" }))).toBe(
      "no-conversation",
    );
    const limited = createMessenger({
      channel: fakeChannel("s", ["text"]),
      store,
      now: () => clock.now,
    });
    expect(
      await failure(limited.send(c.id, { kind: "photo", photo: "p" })),
    ).toBe("unsupported-kind");
  });

  test("an edit goes out with the channel's id of the message it changes", async () => {
    const c = await open();
    const first = await m.send(c.id, { kind: "text", text: "Dinner: Chole" });
    await m.drain();
    const edit = await m.send(c.id, {
      kind: "edit",
      of: first,
      text: "Dinner: Chole ✓",
    });
    expect(await m.drain()).toEqual([{ message: edit, outcome: "sent" }]);
    expect(channel.deliveries[1]?.edits).toBe("f-1");
  });
});

describe("the drain is safe", () => {
  test("two drains at once send each row once, in order", async () => {
    const c = await open();
    const a = await m.send(c.id, { kind: "text", text: "a" });
    const b = await m.send(c.id, { kind: "text", text: "b" });
    // One sentence a message (specs/270): a reply's messages all go in one
    // drain, one after another, so they arrive together.
    const [one, two] = await Promise.all([m.drain(), m.drain()]);
    expect([...one, ...two].map((d) => d.message)).toEqual([a, b]);
    expect(await m.drain()).toEqual([]);
    expect(channel.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: "a" },
      { kind: "text", text: "b" },
    ]);
  });

  test("a row left sending by a crash is unknown, never sent again", async () => {
    const c = await open();
    const id = await m.send(c.id, { kind: "text", text: "a" });
    await store.advance(id, "sending");
    expect(await m.drain()).toEqual([{ message: id, outcome: "unknown" }]);
    expect(channel.deliveries).toEqual([]);
    expect((await store.message(id))?.status).toBe("unknown");
  });

  test("the channel refusing: retried after 1, 5 and 30 minutes, then failed", async () => {
    const c = await open();
    const id = await m.send(c.id, { kind: "text", text: "a" });
    channel.fail(
      new ChannelError("502", true),
      new ChannelError("502", true),
      new ChannelError("502", true),
      new ChannelError("502", true),
    );
    expect(await m.drain()).toEqual([{ message: id, outcome: "retry" }]);
    expect(await m.drain()).toEqual([]);
    clock.now = minutes(1);
    expect(await m.drain()).toEqual([{ message: id, outcome: "retry" }]);
    clock.now = minutes(6);
    expect(await m.drain()).toEqual([{ message: id, outcome: "retry" }]);
    clock.now = minutes(36);
    expect(await m.drain()).toEqual([{ message: id, outcome: "failed" }]);
    expect(await store.message(id)).toMatchObject({
      status: "failed",
      error: "502",
    });
    clock.now = minutes(120);
    expect(await m.drain()).toEqual([]);
  });

  test("a no the channel won't change its mind on fails at once", async () => {
    const c = await open();
    const id = await m.send(c.id, { kind: "text", text: "a" });
    channel.fail(new ChannelError("403 blocked", false));
    expect(await m.drain()).toEqual([{ message: id, outcome: "failed" }]);
  });

  test("asked to wait: the retry waits that long", async () => {
    const c = await open();
    const id = await m.send(c.id, { kind: "text", text: "a" });
    channel.fail(new ChannelError("429", true, 300));
    await m.drain();
    clock.now = minutes(4);
    expect(await m.drain()).toEqual([]);
    clock.now = minutes(5);
    expect(await m.drain()).toEqual([{ message: id, outcome: "sent" }]);
  });
});

describe("receive", () => {
  test("refuses a wrong secret", async () => {
    expect(await m.receive("{}", new Headers())).toBeNull();
  });

  test("records what a known chat sends, and answers a button's message", async () => {
    const c = await open();
    const sent = await m.send(c.id, {
      kind: "buttons",
      text: "Lunch?",
      buttons: [[{ label: "Made", value: "made" }]],
    });
    await m.drain();
    const { body, headers } = channel.update({
      id: "u1",
      chat: "chat-1",
      event: { kind: "button", value: "made", answers: "f-1" },
      ack: "cq-1",
    });
    const got = await m.receive(body, headers);
    expect(got).toMatchObject({
      duplicate: false,
      conversation: { id: c.id },
      event: { kind: "button", value: "made" },
    });
    expect(got?.message).toMatchObject({
      direction: "in",
      kind: "button",
      answers: sent,
    });
    expect((await store.message(sent))?.status).toBe("replied");
    expect(channel.acknowledged).toEqual(["cq-1"]);
  });

  test("the same update twice: the second is a duplicate and records nothing", async () => {
    const c = await open();
    const u = channel.update({
      id: "u2",
      chat: "chat-1",
      event: { kind: "text", text: "hi" },
    });
    await m.receive(u.body, u.headers);
    const again = await m.receive(u.body, u.headers);
    expect(again?.duplicate).toBe(true);
    expect(await store.messages(c.id)).toHaveLength(1);
  });

  test("a stranger: the event comes back with no conversation, nothing recorded", async () => {
    const u = channel.update({
      id: "u3",
      chat: "who",
      event: { kind: "started", code: "KM7Q4HTX" },
    });
    const got = await m.receive(u.body, u.headers);
    expect(got).toMatchObject({
      chat: "who",
      conversation: null,
      message: null,
      event: { kind: "started", code: "KM7Q4HTX" },
    });
  });
});
