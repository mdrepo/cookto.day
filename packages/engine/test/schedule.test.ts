import { describe, expect, test } from "bun:test";
import {
  cooksOn,
  MEAL_TIMES,
  mealTimeProblem,
  upcomingDaysOff,
} from "../src/household.js";

// specs/240-meal-times-and-days-off.md, criterion 7: is the cook cooking
// that day; and the rules the settings screen and the bot share: each
// meal's time, and a meal later than the one before it.

const off = { weekdays: [0], dates: ["2026-10-25"] };

describe("the cook's days off", () => {
  test("is the cook cooking that day", () => {
    // 1 November 2026 is a Sunday; 26 October a Monday.
    expect(cooksOn("2026-11-01", { daysOff: off })).toBe(false);
    expect(cooksOn("2026-10-25", { daysOff: off })).toBe(false);
    expect(cooksOn("2026-10-26", { daysOff: off })).toBe(true);
  });

  test("a date off counts on its own, without its weekday", () => {
    const one = { weekdays: [], dates: ["2026-10-28"] };
    expect(cooksOn("2026-10-28", { daysOff: one })).toBe(false);
    expect(cooksOn("2026-11-04", { daysOff: one })).toBe(true);
  });

  test("dates in the past drop off by themselves", () => {
    expect(upcomingDaysOff(off, "2026-10-26")).toEqual({
      weekdays: [0],
      dates: [],
    });
    expect(upcomingDaysOff(off, "2026-10-25")).toEqual(off);
  });
});

describe("meal times", () => {
  test("each meal has its time, unless the household sets one", () => {
    expect(MEAL_TIMES).toEqual({
      breakfast: "08:00",
      "morning-snack": "11:00",
      lunch: "13:00",
      "evening-snack": "17:00",
      dinner: "20:00",
    });
  });

  test("a meal must be later than the one before it", () => {
    const eaten = ["lunch", "dinner"] as const;
    expect(mealTimeProblem({ ...MEAL_TIMES, dinner: "12:30" }, eaten)).toEqual({
      meal: "dinner",
      before: "lunch",
    });
    expect(mealTimeProblem({ ...MEAL_TIMES, dinner: "13:00" }, eaten)).toEqual({
      meal: "dinner",
      before: "lunch",
    });
    expect(mealTimeProblem({ ...MEAL_TIMES, dinner: "21:00" }, eaten)).toBe(
      null,
    );
    // Only the meals the household eats are compared.
    expect(mealTimeProblem({ ...MEAL_TIMES, breakfast: "23:00" }, eaten)).toBe(
      null,
    );
  });
});
