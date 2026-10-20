import { describe, expect, test } from "bun:test";
import { fakeChannel } from "../src/fake.js";
import { memoryStore } from "../src/memory-store.js";
import { mayAdvance } from "../src/store.js";
import { channelContract, storeContract } from "./contract.js";

// specs/207, criteria 17 and 18: the fakes pass the same contracts as the
// real adapters, so a test that uses them tests the real shape.

const samples = () => {
  const f = fakeChannel();
  return {
    started: (code: string) =>
      f.update({ id: "1", chat: "c", event: { kind: "started", code } }),
    stopped: () => f.update({ id: "2", chat: "c", event: { kind: "stopped" } }),
    text: (text: string) =>
      f.update({ id: "3", chat: "c", event: { kind: "text", text } }),
    photo: (ref: string) =>
      f.update({
        id: "4",
        chat: "c",
        event: { kind: "photo", ref, caption: null },
      }),
    button: (value: string, answers: string) =>
      f.update({
        id: "5",
        chat: "c",
        event: { kind: "button", value, answers },
      }),
    wrongSecret: () => ({
      body: JSON.stringify({ id: "6", chat: "c", event: { kind: "stopped" } }),
      headers: new Headers({ "x-fake-secret": "wrong" }),
    }),
  };
};

channelContract(
  "The fake channel",
  () => {
    const channel = fakeChannel();
    return {
      channel,
      sent: () => channel.deliveries.map((d) => JSON.stringify(d)),
    };
  },
  samples(),
);
storeContract("The store in memory", memoryStore);

describe("statuses", () => {
  test.each([
    ["queued", "sending", true],
    ["sending", "sent", true],
    ["sent", "replied", true],
    ["sent", "sending", false],
    ["replied", "read", false],
    ["sending", "queued", true],
    ["queued", "sending", true],
    ["sent", "queued", false],
    ["failed", "sent", false],
    ["queued", "cancelled", true],
    ["cancelled", "queued", false],
  ] as const)("%s to %s: %p", (from, to, allowed) => {
    expect(mayAdvance(from, to)).toBe(allowed);
  });

  test("an incoming message has no status to advance", () => {
    expect(mayAdvance(null, "sent")).toBe(false);
  });
});

describe("the fake channel", () => {
  test("fails the next delivery when told, once", async () => {
    const f = fakeChannel();
    const { ChannelError } = await import("../src/channel.js");
    f.fail(new ChannelError("down", true));
    const first = await f.deliver("c", { kind: "text", text: "a" }).then(
      () => "ok",
      (e: unknown) => (e instanceof Error ? e.message : "?"),
    );
    expect(first).toBe("down");
    expect(await f.deliver("c", { kind: "text", text: "b" })).toEqual({
      id: "f-1",
    });
    expect(f.deliveries.map((d) => d.message)).toEqual([
      { kind: "text", text: "b" },
    ]);
  });

  test("can be told it supports fewer kinds", () => {
    expect(fakeChannel("s", ["text"]).supports("photo")).toBe(false);
  });
});
