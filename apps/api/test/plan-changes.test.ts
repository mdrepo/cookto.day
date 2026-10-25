import { describe, expect, test } from "bun:test";
import { record } from "./household-support.js";
import {
  COOK_CHAT,
  evening,
  PLANNER_CHAT,
  planRecord,
  TOMORROW,
} from "./tomorrow-support.js";

// specs/270-the-bot-talks-like-a-person.md, criteria 7 to 9: a change after
// the plan went to the cook reaches her, only what changed, two minutes
// after the last change; the planners hear it went, and whether she saw it;
// close to the meal they say first; a meal that has started isn't sent.
// Mayur and Priya eat lunch and dinner; tomorrow, Thursday 22 October, went
// to Sunita at 22:04 on Wednesday. The fake messenger, runs in memory and a
// fixed clock (ADR 0034).

const SUNITA = { id: "77", name: "Sunita" };
const texts = (s: { text: string }[]) => s.map((x) => x.text);
const labels = (s: { buttons: { label: string }[] } | undefined) =>
  (s?.buttons ?? []).map((b) => b.label);

/** Tomorrow sent to Sunita at 22:04, and seen; the chats read since. */
async function sent() {
  const e = await evening({ cook: SUNITA });
  e.at("22:00");
  await e.tick();
  e.at("22:04");
  await e.press(PLANNER_CHAT, "Send it");
  await e.press(COOK_CHAT, "Got it");
  e.to(PLANNER_CHAT);
  e.to(COOK_CHAT);
  return e;
}

describe("7. a change after sending", () => {
  test("two quick changes go to the cook as one, two minutes after the last", async () => {
    const e = await sent();
    e.at("22:30");
    await e.pushed(planRecord("lunch", "rajma", 2));
    e.at("22:31");
    // Priya won't eat dinner: dinner is for one now.
    await e.pushed(
      record("members", "m-2", { kind: "adult", meals: ["lunch"] }, 2),
    );
    e.at("22:32");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
    e.at("22:33");
    await e.tick();
    const change = e.to(COOK_CHAT);
    expect(texts(change)).toEqual([
      "A change for tomorrow, Thursday.",
      "Lunch is Rajma, not Dal tadka.",
      "Dinner is for 1 now.",
    ]);
    expect(labels(change.at(-1))).toEqual(["Got it", "Recipes"]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sent the change to Sunita."]);
    e.at("22:34");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
    expect(e.to(PLANNER_CHAT)).toEqual([]);
  });
});

describe("8. the change seen, or not", () => {
  test("Got it: the planner hears she saw the change", async () => {
    const e = await sent();
    e.at("22:30");
    await e.pushed(planRecord("lunch", "rajma", 2));
    e.at("22:32");
    await e.tick();
    e.to(PLANNER_CHAT);
    e.to(COOK_CHAT);
    await e.press(COOK_CHAT, "Got it");
    expect(texts(e.to(COOK_CHAT))).toEqual(["Thanks."]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sunita saw the change ✓"]);
  });

  test("no Got it in 30 minutes: the planner hears it once", async () => {
    const e = await sent();
    e.at("22:30");
    await e.pushed(planRecord("lunch", "rajma", 2));
    e.at("22:32");
    await e.tick();
    e.to(PLANNER_CHAT);
    for (const [time, heard] of [
      ["23:01", []],
      ["23:02", ["Sunita hasn't seen the change yet."]],
      ["23:03", []],
    ] as const) {
      e.at(time);
      await e.tick();
      expect(texts(e.to(PLANNER_CHAT))).toEqual([...heard]);
    }
  });
});

describe("9. too close to the meal", () => {
  /** Thursday: today's lunch at 13:00 went to Sunita last night. */
  async function today(at: string) {
    const e = await sent();
    e.at(at, TOMORROW);
    await e.pushed(planRecord("lunch", "rajma", 2));
    return e;
  }

  test("within the hour, the planner says first; Send it sends the change", async () => {
    const e = await today("12:20");
    e.at("12:22", TOMORROW);
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
    const ask = e.to(PLANNER_CHAT);
    expect(texts(ask)).toEqual([
      "Lunch is at 1 pm.",
      "Sunita may have started.",
      "Send the change anyway?",
    ]);
    expect(labels(ask.at(-1))).toEqual(["Send it", "Don't send"]);
    await e.press(PLANNER_CHAT, "Send it");
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "A change for today.",
      "Lunch is Rajma, not Dal tadka.",
    ]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sent the change to Sunita."]);
  });

  test("Don't send: the cook hears nothing, and lunch stays swapped", async () => {
    const e = await today("12:20");
    e.at("12:22", TOMORROW);
    await e.tick();
    e.to(PLANNER_CHAT);
    await e.press(PLANNER_CHAT, "Don't send");
    expect(e.to(COOK_CHAT)).toEqual([]);
    expect(e.server("plans", `plan:${TOMORROW}:lunch`)).toMatchObject({
      dish: "rajma",
    });
  });

  test("lunch already started: only dinner's change goes", async () => {
    const e = await today("13:10");
    await e.pushed(planRecord("dinner", "chole", 2));
    e.at("13:12", TOMORROW);
    await e.tick();
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "A change for today.",
      "Dinner is Chole, not Palak paneer.",
    ]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sent the change to Sunita."]);
  });
});
