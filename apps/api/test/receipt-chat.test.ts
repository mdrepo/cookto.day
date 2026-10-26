import { describe, expect, test } from "bun:test";
import { createChanges, createPantry, memoryRecordStore } from "@cookto/data";
import { pull } from "../src/household/sync.js";
import { as } from "./household-flow.js";
import { record } from "./household-support.js";
import {
  agreed,
  answer,
  command,
  EGG,
  FRESH_MART,
  GINGER,
  labels,
  ONION,
  PANEER,
  receiptChat,
  texts,
  TOMATO,
  YESTERDAY,
} from "./receipt-chat-support.js";
import { COOK_CHAT, PLANNER_CHAT } from "./tomorrow-support.js";

// specs/277-receipt-photo-in-telegram.md, criteria 1 to 6 and 10: /receipt,
// asked once, what was found, added for the household with Undo, a line
// asked once, and the planner's phone sees it.

const CONSENT = [
  "Before I read it: the photo goes to Google's Gemini to be read.",
  "Google keeps it a short while only to check for abuse, and never trains on it.",
  "cookto.day keeps only the items.",
];
const FOUND = [
  "Fresh Mart, yesterday: 6 lines.",
  "Found: paneer 800 g, onion 700 g, eggs 15, tomato, ginger 150 g (check this line).",
  "Not sure: Velvet Almond Milk Drink.",
];
const PANEER_TO_BUY = record("shopping", "s-1", {
  ingredient: PANEER,
  addedAt: "2026-10-21T10:00:00.000Z",
  place: 0,
});

describe("1. /receipt asks for the photo", () => {
  test("in every member's menu, and it asks for a photo of the bill", async () => {
    const { e } = await receiptChat();
    for (const chat of [PLANNER_CHAT, COOK_CHAT]) {
      const menu = e.h.channel.menus.get(chat) ?? [];
      expect(menu.find((c) => c.command === "receipt")?.description).toBe(
        "Add a receipt",
      );
      await e.say(chat, command("receipt"));
      expect(texts(e.to(chat))).toEqual(["Send me a photo of the bill."]);
    }
  });
});

describe("2. asked once, before the first photo", () => {
  test("nothing goes to Gemini until Read it; Don't counts nothing; agreed once, never asked again", async () => {
    const r = await receiptChat();
    await r.photo(COOK_CHAT);
    const asked = r.e.to(COOK_CHAT);
    expect(texts(asked)).toEqual(CONSENT);
    expect(labels(asked.at(-1))).toEqual(["Read it", "Don't"]);
    expect(r.ai.seen).toHaveLength(0);
    await r.tap(COOK_CHAT, "Don't");
    expect(texts(r.e.to(COOK_CHAT))).toEqual(["Okay, I won't read it."]);
    expect(r.ai.seen).toHaveLength(0);
    expect(r.counts.counted()).toBe(0);

    await r.photo(COOK_CHAT);
    expect(texts(r.e.to(COOK_CHAT))).toEqual(CONSENT);
    await r.tap(COOK_CHAT, "Read it");
    expect(texts(r.e.to(COOK_CHAT))).toEqual(FOUND);
    expect(r.ai.seen).toHaveLength(1);

    await r.photo(COOK_CHAT);
    expect(texts(r.e.to(COOK_CHAT))).toEqual(FOUND);
    expect(r.ai.seen).toHaveLength(2);
    // Each person agrees for themselves.
    await r.photo(PLANNER_CHAT);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(CONSENT);
  });
});

describe("3. what was found", () => {
  test("the shop, the day, the found lines with amounts, and those it isn't sure of", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    const said = r.e.to(PLANNER_CHAT);
    expect(texts(said)).toEqual(FOUND);
    expect(labels(said.at(-1))).toEqual(["Add 5", "Don't add"]);
    expect(r.ai.seen.at(-1)?.type).toBe("image/jpeg");
  });
});

describe("4. adding, for the household", () => {
  test("Add 5: bought yesterday, with amounts, off the list; then the line it isn't sure of", async () => {
    const r = await receiptChat({ records: [PANEER_TO_BUY] });
    await agreed(r, PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    r.e.to(PLANNER_CHAT);
    await r.tap(PLANNER_CHAT, "Add 5");
    const pantry = r.live("pantry");
    const of = (id: string) => pantry.find((p) => p.ingredient === id);
    expect(pantry).toHaveLength(5);
    expect(of(PANEER)).toMatchObject({ boughtOn: YESTERDAY, amount: 800 });
    expect(of(ONION)).toMatchObject({ amount: 700, unit: "g" });
    expect(of(EGG)).toMatchObject({ amount: 15, unit: "pieces" });
    expect(of(TOMATO)).toMatchObject({ boughtOn: YESTERDAY });
    expect(of(TOMATO)).not.toHaveProperty("amount");
    expect(of(GINGER)).toMatchObject({ amount: 150, unit: "g" });
    expect(r.live("shopping")).toEqual([]);
    const said = r.e.to(PLANNER_CHAT);
    expect(texts(said)).toEqual([
      "Added 5 to the Fridge.",
      "Paneer is off the list.",
      "Add Velvet Almond Milk Drink as it is?",
    ]);
    expect(labels(said[1])).toEqual(["Undo"]);
    expect(labels(said[2])).toEqual(["Add as it is", "Skip"]);
    await r.tap(PLANNER_CHAT, "Add as it is");
    expect(r.live("pantry").map((p) => p.ingredient)).toContain(
      "Velvet Almond Milk Drink",
    );
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "Added Velvet Almond Milk Drink.",
    ]);
  });

  test("Don't add: nothing changes", async () => {
    const r = await receiptChat();
    await agreed(r, PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    r.e.to(PLANNER_CHAT);
    await r.tap(PLANNER_CHAT, "Don't add");
    expect(r.live("pantry")).toEqual([]);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(["Okay, I didn't add it."]);
  });
});

describe("5. Undo", () => {
  test("the five go, paneer is back on the list, and a second press is done already", async () => {
    const r = await receiptChat({ records: [PANEER_TO_BUY] });
    await agreed(r, PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    await r.tap(PLANNER_CHAT, "Add 5");
    r.e.to(PLANNER_CHAT);
    await r.tap(PLANNER_CHAT, "Undo");
    expect(r.live("pantry")).toEqual([]);
    expect(r.live("shopping").map((s) => s.ingredient)).toEqual([PANEER]);
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(["Taken back."]);
    await r.tap(PLANNER_CHAT, "Undo");
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual(["That's done already."]);
  });
});

describe("6. a line is asked once", () => {
  test("added as it is, or skipped, in the chat: the next receipt doesn't ask", async () => {
    const r = await receiptChat();
    const both = {
      ...FRESH_MART,
      lines: [
        "Fresh Paneer 200G|4|90.00|360.00",
        "Velvet Almond Milk Drink|1||199.00",
        "Coca-Cola Zero Sugar|1||40.00",
      ],
    };
    r.ai.next = answer(both);
    await agreed(r, PLANNER_CHAT);
    await r.photo(PLANNER_CHAT);
    await r.tap(PLANNER_CHAT, "Add 1");
    await r.tap(PLANNER_CHAT, "Add as it is");
    r.e.to(PLANNER_CHAT);
    await r.tap(PLANNER_CHAT, "Skip");
    expect(texts(r.e.to(PLANNER_CHAT))).toEqual([
      "Skipped Coca-Cola Zero Sugar.",
    ]);

    await r.photo(PLANNER_CHAT);
    const said = r.e.to(PLANNER_CHAT);
    expect(texts(said)).toEqual([
      "Fresh Mart, yesterday: 3 lines.",
      "Found: paneer 800 g, Velvet Almond Milk Drink.",
    ]);
    expect(labels(said.at(-1))).toEqual(["Add 2", "Don't add"]);
  });
});

describe("10. the phone sees what the chat added", () => {
  test("after a pull, Mayur's Fridge has the five, bought yesterday", async () => {
    const r = await receiptChat();
    await agreed(r, COOK_CHAT);
    await r.photo(COOK_CHAT);
    await r.tap(COOK_CHAT, "Add 5");
    const page = (await (
      await pull(
        as(r.e.session, "GET", "/api/sync/changes?after=0"),
        r.e.h.deps,
      )
    ).json()) as { changes: { collection: string; record: { id: string } }[] };
    const phone = memoryRecordStore();
    for (const c of page.changes) await phone.put(c.collection, [c.record]);
    const items = await createPantry(phone, {
      changes: createChanges(),
    }).reader.items();
    expect(items.map((i) => i.ingredient).sort()).toEqual(
      [PANEER, ONION, EGG, TOMATO, GINGER].sort(),
    );
    expect(items.every((i) => i.boughtOn === YESTERDAY)).toBe(true);
    expect(items.find((i) => i.ingredient === PANEER)?.amount).toBe(800);
  });
});
