import { describe, expect, test } from "bun:test";
import {
  COOK_CHAT,
  evening,
  PLANNER_CHAT,
  planRecord,
  settingsRecord,
  TOMORROW,
} from "./tomorrow-support.js";

// specs/241-tomorrow-in-telegram.md, criteria 1 to 8: at 10 pm household
// time the planner gets tomorrow's plan; "Looks good" sorts it and sends it
// to the cook with her recipes; "Change" opens the app inside Telegram;
// "No cooking" calls tomorrow off; silence is yes at 11 pm; the cook's day
// off; and the bot's switches. The fake messenger, runs in memory and a
// fixed clock (ADR 0034).

const PLAN = "Tomorrow, Thursday:\nLunch: Dal tadka\nDinner: Palak paneer";
const labels = (b: { label: string }[]) => b.map((x) => x.label);

describe("1. the 10 pm question", () => {
  test("nothing at 21:59; the plan and three buttons at 22:00; nothing more at 22:01", async () => {
    const e = await evening();
    e.at("21:59");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);

    e.at("22:00");
    await e.tick();
    const [ask, ...more] = e.to(PLANNER_CHAT);
    expect(more).toEqual([]);
    expect(ask?.text).toBe(PLAN);
    expect(labels(ask?.buttons ?? [])).toEqual([
      "Looks good",
      "Change",
      "No cooking",
    ]);
    // "Change" opens Tomorrow inside Telegram: a page, not a reply.
    const change = ask?.buttons.find((b) => b.label === "Change");
    expect(change && "app" in change ? change.app : "").toMatch(
      /^https:\/\/cookto\.day\//,
    );
    expect(e.to(COOK_CHAT)).toEqual([]);

    e.at("22:01");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
  });
});

describe("2. looks good", () => {
  test("tomorrow is sorted, the cook gets the plan with Recipes, the planner hears it went", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    e.to(PLANNER_CHAT);
    e.at("22:04");
    await e.press(PLANNER_CHAT, "Looks good");
    expect(e.server("household-settings", "household")).toMatchObject({
      sorted: TOMORROW,
      version: 2,
    });
    const [plan, ...more] = e.to(COOK_CHAT);
    expect(more).toEqual([]);
    expect(plan?.text).toBe(PLAN);
    const recipes = plan?.buttons.find((b) => b.label === "Recipes");
    expect(recipes && "app" in recipes ? recipes.app : "").toBe(
      `https://cookto.day/#/cook/${TOMORROW}?d=lunch.dal-tadka.2,dinner.palak-paneer.2&l=en`,
    );
    expect(e.to(PLANNER_CHAT).map((s) => s.text)).toEqual([
      "Sent to the cook.",
    ]);
  });
});

describe("3. already sorted", () => {
  test("sorted in the app at 19:00: nothing to anyone at 22:00", async () => {
    const e = await evening();
    e.at("19:00");
    await e.pushed(settingsRecord({ sorted: TOMORROW }, 2));
    e.at("22:00");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
    expect(e.to(COOK_CHAT)).toEqual([]);
  });
});

describe("4. change, in the app", () => {
  test("the app's Looks good sends once and ends the run; its buttons are done already", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    e.to(PLANNER_CHAT);
    // "Change" is a page: nothing reaches the server until the app acts.
    e.at("22:10");
    await e.pushed(planRecord("dinner", "rajma", 2));
    await e.appSends("Tomorrow\nLunch: Dal tadka\nDinner: Rajma");
    expect(e.to(COOK_CHAT).map((s) => s.text)).toEqual([
      "Tomorrow\nLunch: Dal tadka\nDinner: Rajma",
    ]);
    await e.press(PLANNER_CHAT, "Looks good");
    expect(e.to(PLANNER_CHAT).map((s) => s.text)).toEqual([
      "That's done already.",
    ]);
    e.at("23:00");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
  });
});

describe("5. no cooking", () => {
  test("yes: tomorrow is a day off, the cook is told, and nothing goes at 11 pm", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    e.to(PLANNER_CHAT);
    await e.press(PLANNER_CHAT, "No cooking");
    const [sure] = e.to(PLANNER_CHAT);
    expect(sure?.text).toBe("No cooking tomorrow? The cook will be told.");
    expect(labels(sure?.buttons ?? [])).toEqual(["Yes, tell her", "Back"]);
    await e.press(PLANNER_CHAT, "Yes, tell her");
    expect(e.server("household-settings", "household")).toMatchObject({
      daysOff: { weekdays: [], dates: [TOMORROW] },
    });
    expect(e.to(COOK_CHAT).map((s) => s.text)).toEqual([
      "No cooking tomorrow, Thursday. Enjoy the day off.",
    ]);
    e.at("23:00");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
  });

  test("back: the three buttons again, and nothing changed", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    e.to(PLANNER_CHAT);
    await e.press(PLANNER_CHAT, "No cooking");
    e.to(PLANNER_CHAT);
    await e.press(PLANNER_CHAT, "Back");
    const [again] = e.to(PLANNER_CHAT);
    expect(again?.text).toBe(PLAN);
    expect(labels(again?.buttons ?? [])).toEqual([
      "Looks good",
      "Change",
      "No cooking",
    ]);
    expect(e.server("household-settings", "household")).toMatchObject({
      version: 1,
      daysOff: { weekdays: [], dates: [] },
    });
    expect(e.to(COOK_CHAT)).toEqual([]);
  });
});

describe("6. silence", () => {
  test("unanswered at 23:00: the plan as it stands goes, it's sorted, the planner is told", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    e.to(PLANNER_CHAT);
    // A change from the app after the question: the plan as it stands goes.
    await e.pushed(planRecord("dinner", "rajma", 2));
    e.at("23:00");
    await e.tick();
    expect(e.to(COOK_CHAT).map((s) => s.text)).toEqual([
      "Tomorrow, Thursday:\nLunch: Dal tadka\nDinner: Rajma",
    ]);
    expect(e.server("household-settings", "household")).toMatchObject({
      sorted: TOMORROW,
    });
    expect(e.to(PLANNER_CHAT).map((s) => s.text)).toEqual([
      "Sent to the cook as planned.",
    ]);
  });
});

describe("7. the cook's day off", () => {
  test("Sundays off, tomorrow a Sunday: asked without No cooking; Looks good sends her nothing", async () => {
    // Saturday 24 October: tomorrow is Sunday 25 October.
    const e = await evening({
      settings: { daysOff: { weekdays: [0], dates: [] } },
      plans: false,
    });
    await e.pushed(planRecord("lunch", "dal-tadka", 1, "2026-10-25"));
    e.at("22:00", "2026-10-24");
    await e.tick();
    const [ask] = e.to(PLANNER_CHAT);
    expect(ask?.text).toBe(
      "The cook is off tomorrow.\nTomorrow, Sunday:\nLunch: Dal tadka",
    );
    expect(labels(ask?.buttons ?? [])).toEqual(["Looks good", "Change"]);
    await e.press(PLANNER_CHAT, "Looks good");
    expect(e.server("household-settings", "household")).toMatchObject({
      sorted: "2026-10-25",
    });
    e.at("23:00", "2026-10-24");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
  });
});

describe("8. off switches", () => {
  test("the household's bot off: nothing at 22:00 or 23:00", async () => {
    const e = await evening();
    await e.botOff();
    e.at("22:00");
    await e.tick();
    e.at("23:00");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
    expect(e.to(COOK_CHAT)).toEqual([]);
  });

  test("the bot off for everyone: nothing either", async () => {
    const e = await evening();
    e.w.off = true;
    e.at("22:00");
    await e.tick();
    e.at("23:00");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
    expect(e.to(COOK_CHAT)).toEqual([]);
  });

  test("no plan for tomorrow: no message", async () => {
    const e = await evening({ plans: false });
    e.at("22:00");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
  });
});
