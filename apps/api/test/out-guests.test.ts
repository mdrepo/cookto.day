import { describe, expect, test } from "bun:test";
import type { Event } from "@cookto/messenger";
import { record } from "./household-support.js";
import {
  COOK_CHAT,
  evening,
  PLANNER_CHAT,
  TOMORROW,
} from "./tomorrow-support.js";

// specs/270-the-bot-talks-like-a-person.md, criteria 12 and 13 (/guests):
// who's out and guests, from the chat, change the plan everywhere; once the
// plan went to the cook, she hears it as a change. Mayur, Priya, Dadi and
// Ravi eat lunch and dinner; tomorrow, Thursday, went to Sunita at 22:04.

const SUNITA = { id: "77", name: "Sunita" };
const texts = (s: { text: string }[]) => s.map((x) => x.text);
const labels = (s: { buttons: { label: string }[] } | undefined) =>
  (s?.buttons ?? []).map((b) => b.label);
const command = (name: string) => ({ kind: "command", name }) as Event;
const person = (id: string, nickname: string) =>
  record("members", id, {
    kind: "adult",
    meals: ["lunch", "dinner"],
    nickname,
  });
const FOUR = [
  person("m-1", "Mayur"),
  person("m-2", "Priya"),
  person("m-3", "Dadi"),
  person("m-4", "Ravi"),
];

/** Tomorrow sent to Sunita at 22:04, and seen. */
async function sent() {
  const e = await evening({ cook: SUNITA, members: FOUR });
  e.at("22:00");
  await e.tick();
  e.at("22:04");
  await e.press(PLANNER_CHAT, "Send it");
  await e.press(COOK_CHAT, "Got it");
  e.to(PLANNER_CHAT);
  e.to(COOK_CHAT);
  return e;
}

describe("12. /out", () => {
  test("Priya out for tomorrow's dinner: three eat it, and Sunita hears", async () => {
    const e = await sent();
    e.at("22:10");
    await e.say(PLANNER_CHAT, command("out"));
    const who = e.to(PLANNER_CHAT);
    expect(texts(who)).toEqual(["Who's out?"]);
    expect(labels(who.at(-1))).toEqual(["Mayur", "Priya", "Dadi", "Ravi"]);
    await e.press(PLANNER_CHAT, "Priya");
    const when = e.to(PLANNER_CHAT);
    expect(texts(when)).toEqual(["When?"]);
    expect(labels(when.at(-1))).toEqual(["Today", "Tomorrow"]);
    await e.press(PLANNER_CHAT, "Tomorrow");
    const meals = e.to(PLANNER_CHAT);
    expect(texts(meals)).toEqual(["Which meals?"]);
    expect(labels(meals.at(-1))).toEqual(["Lunch", "Dinner", "All day"]);
    await e.press(PLANNER_CHAT, "Dinner");
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Got it.",
      "Priya's out for dinner tomorrow.",
      "Dinner is for 3 now.",
    ]);
    expect(e.server("eating", `eating:${TOMORROW}:dinner`)).toMatchObject({
      on: TOMORROW,
      slot: "dinner",
      out: ["m-2"],
      guests: 0,
    });
    e.at("22:12");
    await e.tick();
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "A change for tomorrow, Thursday.",
      "Dinner is for 3 now.",
    ]);
  });
});

describe("13. /guests", () => {
  test("two guests at tomorrow's dinner: six eat it", async () => {
    const e = await sent();
    e.at("22:10");
    await e.say(PLANNER_CHAT, command("guests"));
    const many = e.to(PLANNER_CHAT);
    expect(texts(many)).toEqual(["How many guests?"]);
    expect(labels(many.at(-1))).toEqual(["1", "2", "3", "4", "5+"]);
    await e.press(PLANNER_CHAT, "2");
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["When?"]);
    await e.press(PLANNER_CHAT, "Tomorrow");
    const meal = e.to(PLANNER_CHAT);
    expect(texts(meal)).toEqual(["Which meal?"]);
    expect(labels(meal.at(-1))).toEqual(["Lunch", "Dinner"]);
    await e.press(PLANNER_CHAT, "Dinner");
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Got it.",
      "Dinner tomorrow is for 6 now.",
    ]);
    expect(e.server("eating", `eating:${TOMORROW}:dinner`)).toMatchObject({
      guests: 2,
    });
  });

  test("5+: asks how many, and takes the number", async () => {
    const e = await sent();
    e.at("22:10");
    await e.say(PLANNER_CHAT, command("guests"));
    e.to(PLANNER_CHAT);
    await e.press(PLANNER_CHAT, "5+");
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["How many?"]);
    await e.say(PLANNER_CHAT, { kind: "text", text: "7" });
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["When?"]);
    await e.press(PLANNER_CHAT, "Tomorrow");
    e.to(PLANNER_CHAT);
    await e.press(PLANNER_CHAT, "Lunch");
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Got it.",
      "Lunch tomorrow is for 11 now.",
    ]);
  });
});
