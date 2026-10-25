import { workflow } from "./workflow.js";

// /out and /guests (specs/270): who's out or how many come, when, and which
// meal. A run keeps the words it was made with, so each answer starts the
// next question as a run of its own, carrying what's been said so far.

const PEOPLE = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const MEALS = [
  "breakfast",
  "morning_snack",
  "lunch",
  "evening_snack",
  "dinner",
];
const to = (keys: readonly string[], step: string) =>
  Object.fromEntries(keys.map((k) => [k, step]));

export const OUT_WHO = workflow("out_who", {
  first: "who",
  steps: {
    who: { action: "peopleToPick", sends: "out_who", on: to(PEOPLE, "picked") },
    picked: { action: "outWho", then: "end" },
  },
});

export const OUT_WHEN = workflow("out_when", {
  first: "when",
  steps: {
    when: { sends: "pick_when", on: to(["today", "tomorrow"], "picked") },
    picked: { action: "outWhen", then: "end" },
  },
});

export const OUT_MEALS = workflow("out_meals", {
  first: "meals",
  steps: {
    meals: {
      action: "personMeals",
      sends: "out_meals",
      on: { ...to(MEALS, "picked"), all: "allDay" },
    },
    picked: { action: "outDone", sends: "out_done", then: "end" },
    // All day says so in its own words.
    allDay: { action: "outDone", sends: "out_done_all", then: "end" },
  },
});

export const GUESTS_COUNT = workflow("guests_count", {
  first: "count",
  steps: {
    count: {
      sends: "guests_count",
      on: { ...to(["g1", "g2", "g3", "g4"], "picked"), more: "ask" },
    },
    picked: { action: "guestsCount", then: "end" },
    ask: { sends: "guests_how_many", text: "typed" },
    typed: { action: "guestsCount", then: "end" },
  },
});

export const GUESTS_WHEN = workflow("guests_when", {
  first: "when",
  steps: {
    when: { sends: "pick_when", on: to(["today", "tomorrow"], "picked") },
    picked: { action: "guestsWhen", then: "end" },
  },
});

export const GUESTS_MEAL = workflow("guests_meal", {
  first: "meal",
  steps: {
    meal: { action: "dayMeals", sends: "guests_meal", on: to(MEALS, "picked") },
    picked: { action: "guestsDone", sends: "guests_done", then: "end" },
  },
});
