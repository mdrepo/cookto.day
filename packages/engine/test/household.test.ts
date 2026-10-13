import { describe, expect, test } from "bun:test";
import {
  defaultMeals,
  eatersOf,
  type MealSlot,
  type Member,
  memberProblems,
  plannedSlots,
} from "../src/household.js";

// specs/58-household.md: people, the meals they eat, and which slots get
// planned (ADR 0026).

const adult: Member = { id: "a", kind: "adult", meals: ["lunch", "dinner"] };
const child: Member = { id: "c", kind: "child", meals: defaultMeals("child") };

describe("the household", () => {
  test("a new person's meals start from who they are", () => {
    expect(defaultMeals("adult")).toEqual(["lunch", "dinner"]);
    const all: MealSlot[] = [
      "breakfast",
      "morning-snack",
      "lunch",
      "evening-snack",
      "dinner",
    ];
    expect(defaultMeals("child")).toEqual(all);
    expect(defaultMeals("toddler")).toEqual(all);
  });

  test("the plan covers every slot someone eats, in the day's order", () => {
    expect(plannedSlots([adult, child])).toEqual([
      "breakfast",
      "morning-snack",
      "lunch",
      "evening-snack",
      "dinner",
    ]);
    // In the day's order, whatever order the person ticked them in.
    expect(plannedSlots([{ ...adult, meals: ["dinner", "lunch"] }])).toEqual([
      "lunch",
      "dinner",
    ]);
    expect(plannedSlots([])).toEqual([]);
  });

  test("each slot is planned for the people who eat it", () => {
    expect(eatersOf("lunch", [adult, child])).toEqual([adult, child]);
    expect(eatersOf("morning-snack", [adult, child])).toEqual([child]);
  });

  test("a person's meals are the five slots, each once", () => {
    expect(memberProblems(adult)).toEqual([]);
    expect(memberProblems({ ...adult, meals: ["brunch"] })).toEqual([
      'eats "brunch", which isn\'t a meal slot',
    ]);
    expect(memberProblems({ ...adult, meals: ["lunch", "lunch"] })).toEqual([
      'eats "lunch" twice',
    ]);
    expect(memberProblems({ ...adult, kind: "teen" })).toEqual([
      'is a "teen", not an adult, child or toddler',
    ]);
    expect(memberProblems({ id: "x" })).toEqual([
      "has no type: adult, child or toddler",
      "has no list of meals",
    ]);
  });
});
