import { describe, expect, test } from "bun:test";
import { record } from "./household-support.js";
import {
  COOK_CHAT,
  evening,
  PLANNER_CHAT,
  planRecord,
  TOMORROW,
} from "./tomorrow-support.js";

// specs/270-the-bot-talks-like-a-person.md, criteria 1 to 5 and 19: one
// sentence a message, only the first with a sound; counts, the child's dish
// and the reason on each meal; names; the cook's "Got it" and "not seen";
// and a household where the planner cooks. Tomorrow is Thursday 22 October,
// asked on Wednesday evening in Kolkata. The fake messenger, runs in memory
// and a fixed clock (ADR 0034).

const SUNITA = { id: "77", name: "Sunita" };
const texts = (s: { text: string }[]) => s.map((x) => x.text);
const labels = (s: { buttons: { label: string }[] } | undefined) =>
  (s?.buttons ?? []).map((b) => b.label);

const person = (id: string, kind: string, meals: string[], nickname = "") =>
  record("members", id, { kind, meals, nickname });

/** Mayur, Priya, Dadi and Aarav: lunch and dinner each. */
const FAMILY = [
  person("m-1", "adult", ["lunch", "dinner"], "Mayur"),
  person("m-2", "adult", ["lunch", "dinner"], "Priya"),
  person("m-3", "adult", ["lunch", "dinner"], "Dadi"),
  person("m-4", "child", ["lunch", "dinner"], "Aarav"),
];

describe("1. one sentence, one message, one sound", () => {
  test("four messages in order; only the first rings; only the last has buttons", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    const to = e.h.channel.deliveries.filter((d) => d.chat === PLANNER_CHAT);
    expect(to.map((d) => ("text" in d.message ? d.message.text : ""))).toEqual([
      "Hi Mayur, here's tomorrow, Thursday.",
      "Lunch for 2: Dal tadka.",
      "Dinner for 2: Palak paneer.",
      "Shall I send it to the cook?",
    ]);
    const silent = (m: (typeof to)[number]["message"]) =>
      "silent" in m && m.silent;
    expect(to.map((d) => silent(d.message))).toEqual([false, true, true, true]);
    expect(to.map((d) => d.message.kind)).toEqual([
      "text",
      "text",
      "text",
      "buttons",
    ]);
    expect(labels(e.to(PLANNER_CHAT).at(-1))).toEqual([
      "Send it",
      "Change",
      "No cooking",
    ]);
  });
});

describe("2. counts, the child's dish and the reason", () => {
  test("lunch for the three adults, Aarav's own dish, dinner for four, and the curd", async () => {
    const e = await evening({
      settings: {
        kitchen: {
          cuisines: ["north-indian", "our-kitchen"],
          skip: [],
          sample: null,
        },
      },
      members: FAMILY,
      plans: [
        planRecord("lunch", "kadhi-pakora"),
        record("plans", `plan:${TOMORROW}:lunch:child`, {
          on: TOMORROW,
          slot: "lunch",
          dish: "beetroot-potato-tikki",
          prep: null,
          for: "child",
        }),
        planRecord("dinner", "palak-paneer"),
      ],
      // Curd bought Tuesday keeps 3 days: its last good day is Friday.
      records: [
        record("pantry", "p-curd", {
          ingredient: "Q13317",
          boughtOn: "2026-10-20",
          shelfLifeDays: 3,
        }),
      ],
    });
    e.at("22:00");
    await e.tick();
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Hi Mayur, here's tomorrow, Thursday.",
      "Lunch for 3: Kadhi pakora. It uses the curd, which goes off Friday.",
      "For Aarav: Beetroot potato tikki.",
      "Dinner for 4: Palak paneer.",
      "Shall I send it to the cook?",
    ]);
  });
});

describe("3. the cook's name", () => {
  test("a cook connected without a name is named by their next tap", async () => {
    const e = await evening();
    e.at("22:00");
    await e.tick();
    await e.press(PLANNER_CHAT, "Send it");
    e.to(PLANNER_CHAT);
    e.to(COOK_CHAT);
    await e.press(COOK_CHAT, "Got it", SUNITA);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sunita saw tomorrow's plan ✓"]);
    // The next evening's question says her name too.
    await e.pushed(planRecord("lunch", "rajma", 1, "2026-10-23"));
    e.at("22:00", TOMORROW);
    await e.tick();
    expect(texts(e.to(PLANNER_CHAT)).at(-1)).toBe("Shall I send it to Sunita?");
  });
});

describe("4. got it", () => {
  test("the cook's plan by name, Got it, Thanks, and the planner hears she saw it", async () => {
    const e = await evening({ cook: SUNITA });
    e.at("22:00");
    await e.tick();
    expect(texts(e.to(PLANNER_CHAT)).at(-1)).toBe("Shall I send it to Sunita?");
    e.at("22:04");
    await e.press(PLANNER_CHAT, "Send it");
    const plan = e.to(COOK_CHAT);
    expect(texts(plan)).toEqual([
      "Hi Sunita, here's tomorrow, Thursday, from Mayur.",
      "Lunch for 2: Dal tadka.",
      "Dinner for 2: Palak paneer.",
      "Tap Got it once you've seen it.",
    ]);
    expect(labels(plan.at(-1))).toEqual(["Got it", "Recipes"]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sent to Sunita."]);
    await e.press(COOK_CHAT, "Got it");
    expect(texts(e.to(COOK_CHAT))).toEqual(["Thanks."]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Sunita saw tomorrow's plan ✓"]);
  });
});

describe("5. not seen", () => {
  test("no Got it by an hour before breakfast: the planner hears it once, at 07:00", async () => {
    const e = await evening({
      cook: SUNITA,
      members: [
        person("m-1", "adult", ["breakfast", "lunch", "dinner"], "Mayur"),
      ],
      plans: [
        planRecord("breakfast", "aloo-paratha"),
        planRecord("lunch", "dal-tadka"),
      ],
    });
    e.at("22:00");
    await e.tick();
    e.at("22:04");
    await e.press(PLANNER_CHAT, "Send it");
    e.to(PLANNER_CHAT);
    for (const [time, heard] of [
      ["06:59", []],
      ["07:00", ["Sunita hasn't seen tomorrow's plan yet."]],
      ["07:01", []],
    ] as const) {
      e.at(time, TOMORROW);
      await e.tick();
      expect(texts(e.to(PLANNER_CHAT))).toEqual([...heard]);
    }
  });
});

describe("19. the planner cooks", () => {
  test("no cook on Telegram: Looks good sorts it, tonight's soak, Recipes, and the meal checks come to the planner", async () => {
    const e = await evening({
      cook: false,
      plans: [
        planRecord("lunch", "chole"),
        planRecord("dinner", "palak-paneer"),
      ],
    });
    e.at("22:00");
    await e.tick();
    const ask = e.to(PLANNER_CHAT);
    expect(texts(ask)).toEqual([
      "Hi Mayur, here's tomorrow, Thursday.",
      "Lunch for 2: Chole.",
      "Dinner for 2: Palak paneer.",
      "Tonight: soak the chickpeas.",
      "Does this look right?",
    ]);
    expect(labels(ask.at(-1))).toEqual([
      "Looks good",
      "Change",
      "No cooking",
      "Recipes",
    ]);
    await e.press(PLANNER_CHAT, "Looks good");
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["Tomorrow's sorted."]);
    expect(e.server("household-settings", "household")).toMatchObject({
      sorted: TOMORROW,
    });
    e.at("23:00");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
    e.at("14:00", TOMORROW);
    await e.tick();
    const check = e.to(PLANNER_CHAT);
    expect(texts(check)).toEqual(["Did you make lunch?", "Chole"]);
    expect(labels(check.at(-1))).toEqual(["Yes", "No"]);
    expect(
      e.h.channel.deliveries.some(
        (d) => "text" in d.message && /cook/i.test(d.message.text ?? ""),
      ),
    ).toBe(false);
  });
});
