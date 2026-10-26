import { describe, expect, test } from "bun:test";
import type { Event } from "@cookto/messenger";
import { workflow } from "@cookto/workflows";
import { runId, startRun } from "../src/workflows/tomorrow.js";
import {
  agreed,
  answer,
  FRESH_MART,
  receiptChat,
  texts,
} from "./receipt-chat-support.js";
import { jpeg, png } from "./support.js";
import { PLANNER_CHAT } from "./tomorrow-support.js";

// specs/277-receipt-photo-in-telegram.md, criteria 7 to 9: what stops a
// read, in plain words, counted as the app's are (specs/129); only a small
// photo reaches Gemini, and nothing of it is kept; a question waiting for
// a photo comes first, and files are refused.

const NOT_WORKING = ["Receipt photos aren't working right now."];

describe("7. what stops a read, in plain words", () => {
  test("the household's 3 a day, counted with the app's", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    // One read in the app, the same count.
    await r.counts.usage.take({ household: r.e.household, address: "a" });
    await r.photo(PLANNER_CHAT);
    r.e.to(PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "You've read 3 receipts today. Try again tomorrow.",
    ]);
    expect(r.ai.seen).toHaveLength(2);
  });

  test("the household's 30 a month", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    for (let day = 1; day <= 10; day++) {
      r.counts.clock.now = new Date(
        `2026-10-${String(day).padStart(2, "0")}T09:00:00Z`,
      );
      for (let i = 0; i < 3; i++)
        await r.counts.usage.take({ household: r.e.household, address: "a" });
    }
    r.counts.clock.now = new Date("2026-10-21T13:00:00Z");
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "You've read 30 receipts this month.",
    ]);
  });

  test("not a receipt, and a rejected answer", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    r.ai.next = answer({ lines: [] });
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "This doesn't look like a receipt.",
    ]);
    r.ai.next = answer({ ...FRESH_MART, lines: ["Visit www.win.com|1||1.00"] });
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "I couldn't read this photo. Try again tomorrow.",
    ]);
  });

  test("off, or Gemini or Telegram failing: not working, and not counted", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    const counted = r.counts.counted();
    r.ai.next = { ok: false, reason: "unavailable" };
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(NOT_WORKING);
    await r.e.say(PLANNER_CHAT, {
      kind: "photo",
      ref: "telegram-lost-it",
      caption: null,
    });
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(NOT_WORKING);
    expect(r.counts.counted()).toBe(counted);

    const off = await receiptChat();
    if (off.e.h.deps.receipts) off.e.h.deps.receipts.reader = null;
    await off.photo(PLANNER_CHAT);
    expect(texts(off.e.to(PLANNER_CHAT))).toEqual(NOT_WORKING);
    expect(off.counts.counted()).toBe(0);
  });
});

describe("8. only a small photo reaches Gemini, and nothing is kept", () => {
  test("over 1.5 MB, or not a JPEG or WebP by its bytes: refused, uncounted", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    const counted = r.counts.counted();
    r.e.h.channel.files.set("big", jpeg(1_500_001));
    await r.photo(PLANNER_CHAT, "big");
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(NOT_WORKING);
    r.e.h.channel.files.set("png", png());
    await r.photo(PLANNER_CHAT, "png");
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(NOT_WORKING);
    expect(r.counts.counted()).toBe(counted);
    expect(r.ai.seen).toHaveLength(1);
  });

  test("Gemini gets the photo alone; the log line has counts, never content", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    expect(r.ai.seen[0]).toEqual({ bytes: jpeg(), type: "image/jpeg" });
    const line = r.e.h.logged.find((l) => l.route === "receipts/telegram");
    expect(line).toMatchObject({
      status: 200,
      lines: 6,
      tokensIn: 300,
      tokensOut: 120,
    });
    const logs = JSON.stringify(r.e.h.logged);
    for (const word of ["Fresh Mart", "Paneer", "photo-1"])
      expect(logs).not.toContain(word);
  });
});

describe("9. a question waiting for a photo comes first; files are refused", () => {
  test("a photo goes to the run that waits for one, not to a receipt", async () => {
    const r = await receiptChat();
    const asks = workflow("asks_photo", {
      first: "ask",
      steps: {
        ask: { sends: "receipt_send", photo: "got" },
        got: { then: "end" },
      },
    });
    r.e.w.workflows = { ...r.e.w.workflows, asks_photo: asks };
    const mayur = r.e.h.households.members.find(
      (m) => m.conversation !== null && m.role !== "cook",
    );
    await startRun(r.e.h.deps, r.e.household, runId("asks"), {
      workflow: "asks_photo",
      audience: mayur?.id ?? "",
      about: {},
    });
    // Its question goes out after the start, as every run's does.
    await r.e.h.settle();
    r.e.to(PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([]);
    expect(r.ai.seen).toHaveLength(0);
  });

  test("a PDF or any other file: photos only, for now", async () => {
    const r = await receiptChat();
    await r.e.say(PLANNER_CHAT, {
      kind: "file",
      name: "invoice.pdf",
    } as Event);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "I can read photos of bills for now. Send it as a photo.",
    ]);
  });

  test("with the bot off, it says so", async () => {
    const r = await receiptChat();
    await r.e.botOff();
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(["I'm switched off for now."]);
  });
});
