import { describe, expect, test } from "bun:test";
import { fakeChannel } from "../src/fake.js";
import { memoryStore } from "../src/memory-store.js";
import { createMessenger } from "../src/messenger.js";
import { SECRET_HEADER, telegram } from "../src/telegram.js";
import { fakeNetwork } from "./contract.js";

// specs/216, criterion 6, the package's half (ADR 0033): Start says who
// pressed it, the channel's own id for the person and their first name, so
// the API can sign them in. It travels beside the event and is never written
// into a message row: the name is kept once, on the identity, not per message.

const T0 = "2026-10-20T19:00:00.000Z";
const SECRET = "made-up-secret";

describe("who pressed Start", () => {
  test("Telegram: the sender's user id and first name come with the update, or nothing", () => {
    const channel = telegram({
      token: "123456:made-up-token",
      secret: SECRET,
      send: fakeNetwork().send,
    });
    const parsed = channel.parse(
      JSON.stringify({
        update_id: 1,
        message: {
          message_id: 10,
          chat: { id: 42 },
          from: { id: 42, first_name: "Mayur", username: "not-kept" },
          text: "/start KM7Q4HTX",
        },
      }),
      new Headers({ [SECRET_HEADER]: SECRET }),
    );
    expect(parsed?.event).toEqual({ kind: "started", code: "KM7Q4HTX" });
    expect(parsed?.from).toEqual({ id: "42", name: "Mayur" });
    const nobody = channel.parse(
      JSON.stringify({
        update_id: 2,
        message: { message_id: 11, chat: { id: 42 }, text: "/start X" },
      }),
      new Headers({ [SECRET_HEADER]: SECRET }),
    );
    expect(nobody?.event).toEqual({ kind: "started", code: "X" });
    expect(nobody?.from).toBeUndefined();
  });

  test("the fake carries `from` the same way", () => {
    const f = fakeChannel();
    const u = f.update({
      id: "u1",
      chat: "chat-1",
      event: { kind: "started", code: "KM7Q4HTX" },
      from: { id: "42", name: "Mayur" },
    });
    expect(f.parse(u.body, u.headers)?.from).toEqual({
      id: "42",
      name: "Mayur",
    });
  });

  test("receive hands `from` to the handler, and records no name", async () => {
    const channel = fakeChannel();
    const store = memoryStore();
    const m = createMessenger({ channel, store, now: () => T0 });
    const c = await store.open(
      "fake",
      "chat-1",
      { kind: "link", id: "L1" },
      T0,
    );
    const u = channel.update({
      id: "u2",
      chat: "chat-1",
      event: { kind: "text", text: "hello" },
      from: { id: "42", name: "Mayur" },
    });
    const got = await m.receive(u.body, u.headers);
    expect(got?.from).toEqual({ id: "42", name: "Mayur" });
    const rows = await store.messages(c.id);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0]?.content)).not.toContain("Mayur");
  });
});
