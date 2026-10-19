import { describe, expect, test } from "bun:test";
import type { Channel, Send } from "../src/channel.js";
import type { Store } from "../src/store.js";

// specs/207, criteria 17 and 18: what every channel and every store must do
// (ADR 0031). Each adapter's tests run these; the Postgres store runs them
// in CI against the migration (ADR 0032).

/** A webhook body and headers in the channel's own shape, for each event. */
export interface Samples {
  started(code: string): { body: string; headers: Headers };
  stopped(): { body: string; headers: Headers };
  text(text: string): { body: string; headers: Headers };
  photo(ref: string): { body: string; headers: Headers };
  button(value: string, answers: string): { body: string; headers: Headers };
  wrongSecret(): { body: string; headers: Headers };
}

/** A network that answers every call the same, and remembers each one. */
export function fakeNetwork(
  answer: unknown = { ok: true, result: { message_id: 7 } },
) {
  const calls: { url: string; body: string }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, body: typeof init.body === "string" ? init.body : "" });
    return Promise.resolve(
      new Response(JSON.stringify(answer), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  return { send, calls };
}

/** A channel under test, and a way to see what it sent, as text. */
export interface Made {
  channel: Channel;
  /** Each delivery so far, serialised: the contract looks for words in it. */
  sent: () => string[];
}

export function channelContract(
  name: string,
  make: () => Made,
  samples: Samples,
): void {
  describe(`${name} is a channel`, () => {
    test("sends text, and the channel sees it", async () => {
      const { channel, sent } = make();
      const { id } = await channel.deliver("chat-1", {
        kind: "text",
        text: "Tomorrow\nLunch: Chole",
      });
      expect(id).not.toBe("");
      expect(sent()).toHaveLength(1);
      expect(sent()[0]).toContain("Lunch: Chole");
    });

    test("sends buttons, and the channel sees each label and value", async () => {
      const { channel, sent } = make();
      await channel.deliver("chat-1", {
        kind: "buttons",
        text: "Tomorrow",
        buttons: [[{ label: "Got it", value: "ok" }]],
      });
      expect(sent()[0]).toContain("Got it");
      expect(sent()[0]).toContain("ok");
    });

    test("sends a photo by its reference", async () => {
      const { channel, sent } = make();
      await channel.deliver("chat-1", { kind: "photo", photo: "file-9" });
      expect(sent()[0]).toContain("file-9");
    });

    test("edits a sent message by the channel's id", async () => {
      const { channel, sent } = make();
      await channel.deliver(
        "chat-1",
        { kind: "edit", of: "m-1", text: "Dinner: Palak paneer ✓" },
        "77",
      );
      expect(sent()[0]).toContain("77");
      expect(sent()[0]).toContain("Palak paneer");
    });

    test("says which kinds it supports", () => {
      expect(make().channel.supports("text")).toBe(true);
    });

    test.each([
      [
        "started",
        () => samples.started("KM7Q4HTX"),
        { kind: "started", code: "KM7Q4HTX" },
      ],
      ["stopped", () => samples.stopped(), { kind: "stopped" }],
      [
        "text",
        () => samples.text("ok thanks"),
        { kind: "text", text: "ok thanks" },
      ],
      [
        "photo",
        () => samples.photo("file-3"),
        { kind: "photo", ref: "file-3" },
      ],
      [
        "button",
        () => samples.button("made:lunch", "77"),
        { kind: "button", value: "made:lunch", answers: "77" },
      ],
    ])("receives %s", (_, sample, expected) => {
      const { body, headers } = sample();
      const parsed = make().channel.parse(body, headers);
      expect(parsed).not.toBeNull();
      expect(parsed?.event).toMatchObject(expected);
      expect(parsed?.chat).not.toBe("");
      expect(parsed?.updateId).not.toBe("");
    });

    test("refuses a wrong secret", () => {
      const { body, headers } = samples.wrongSecret();
      expect(make().channel.parse(body, headers)).toBeNull();
    });
  });
}

const T0 = "2026-10-20T10:00:00.000Z";
const T1 = "2026-10-20T10:01:00.000Z";
const OWNER = { kind: "link", id: "L1" };

const out = (conversation: string, context: unknown = null) => ({
  conversation,
  direction: "out" as const,
  kind: "text",
  content: { kind: "text", text: "hi" },
  answers: null,
  channelId: null,
  at: T0,
  status: "queued" as const,
  error: null,
  context,
});

export function storeContract(
  name: string,
  make: () => Store | Promise<Store>,
): void {
  describe(`${name} is a store`, () => {
    test("opens a conversation and finds it by channel and chat", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      expect(await s.find("telegram", "123")).toEqual(c);
      expect(await s.find("telegram", "999")).toBeNull();
      expect(await s.get(c.id)).toEqual(c);
    });

    test("keeps messages in order, and the conversation's last time", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const a = await s.add(out(c.id));
      const b = await s.add({
        ...out(c.id),
        at: T1,
        direction: "in",
        status: null,
      });
      expect((await s.messages(c.id)).map((r) => r.id)).toEqual([a.id, b.id]);
      expect((await s.get(c.id))?.lastMessageAt).toBe(T1);
    });

    test("statuses only move forward", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const m = await s.add(out(c.id));
      expect(await s.advance(m.id, "sending")).toBe(true);
      expect(await s.advance(m.id, "sent", { channelId: "77" })).toBe(true);
      expect(await s.advance(m.id, "sending")).toBe(false);
      expect(await s.advance(m.id, "replied")).toBe(true);
      expect(await s.advance(m.id, "failed")).toBe(false);
      expect((await s.message(m.id))?.channelId).toBe("77");
      expect(await s.byChannelId(c.id, "77")).toMatchObject({ id: m.id });
    });

    test("the outbox: due rows, one per conversation, locked once claimed", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const d = await s.open("telegram", "456", OWNER, T0);
      const m1 = await s.add(out(c.id));
      const m2 = await s.add(out(c.id));
      const m3 = await s.add(out(d.id));
      const later = await s.add(out(d.id));
      for (const m of [m1, m2, m3]) await s.enqueue(m.id, T0);
      await s.enqueue(later.id, "2026-10-21T10:00:00.000Z");
      const first = await s.claim(T1, "2026-10-20T10:02:00.000Z");
      expect(first.map((x) => x.message).sort()).toEqual([m1.id, m3.id].sort());
      expect(await s.claim(T1, "2026-10-20T10:02:00.000Z")).toEqual([]);
      await s.dequeue(m1.id);
      await s.dequeue(m3.id);
      expect(
        (await s.claim(T1, "2026-10-20T10:02:00.000Z")).map((x) => x.message),
      ).toEqual([m2.id]);
    });

    test("a retry waits, then comes back with its count", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const m = await s.add(out(c.id));
      await s.enqueue(m.id, T0);
      await s.claim(T0, T1);
      await s.retry(m.id, "2026-10-20T10:05:00.000Z", 1);
      expect(await s.claim(T1, "2026-10-20T10:02:00.000Z")).toEqual([]);
      expect(
        await s.claim("2026-10-20T10:05:00.000Z", "2026-10-20T10:06:00.000Z"),
      ).toEqual([{ message: m.id, conversation: c.id, attempts: 1 }]);
    });

    test("waiting messages by context, and cancelling them", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const m = await s.add(out(c.id, { plan: "2026-10-21" }));
      await s.enqueue(m.id, T1);
      await s.add(out(c.id, { plan: "2026-10-22" }));
      expect(
        (await s.waiting(c.id, { plan: "2026-10-21" })).map((r) => r.id),
      ).toEqual([m.id]);
      await s.advance(m.id, "cancelled");
      await s.dequeue(m.id);
      expect(await s.waiting(c.id, { plan: "2026-10-21" })).toEqual([]);
      expect(
        await s.claim("2026-10-21T00:00:00.000Z", "2026-10-21T00:01:00.000Z"),
      ).toEqual([]);
    });

    test("an update is seen once", async () => {
      const s = await make();
      expect(await s.seen("telegram", "500", T0)).toBe(false);
      expect(await s.seen("telegram", "500", T1)).toBe(true);
      expect(await s.seen("fake", "500", T1)).toBe(false);
    });

    test("removing a conversation takes its messages and outbox rows", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const m = await s.add(out(c.id));
      await s.enqueue(m.id, T0);
      await s.remove(c.id);
      expect(await s.get(c.id)).toBeNull();
      expect(await s.message(m.id)).toBeNull();
      expect(await s.claim(T1, "2026-10-20T10:02:00.000Z")).toEqual([]);
    });

    test("purging old messages", async () => {
      const s = await make();
      const c = await s.open("telegram", "123", OWNER, T0);
      const old = await s.add({ ...out(c.id), at: "2026-07-01T00:00:00.000Z" });
      const recent = await s.add(out(c.id));
      expect(await s.purge("2026-07-22T00:00:00.000Z")).toBe(1);
      expect(await s.message(old.id)).toBeNull();
      expect(await s.message(recent.id)).not.toBeNull();
    });
  });
}
