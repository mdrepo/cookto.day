import { describe, expect, test } from "bun:test";
import {
  type Eating,
  eatersOn,
  type Member,
  servingsOn,
} from "../src/index.js";

// specs/270, criterion 16: who eats a meal on a day, once who's out and the
// guests are counted. Guests count as adults; a child's own dish is still
// the children's.

const person = (id: string, kind: Member["kind"] = "adult"): Member => ({
  id,
  kind,
  meals: ["lunch", "dinner"],
});
const FOUR = [person("m-1"), person("m-2"), person("m-3"), person("m-4")];
const TODAY = "2026-10-21";
const TOMORROW = "2026-10-22";

describe("who eats, on a day", () => {
  test("Priya out and two guests at tomorrow's dinner: five then, four today", () => {
    const eating: Eating[] = [
      { on: TOMORROW, slot: "dinner", out: ["m-2"], guests: 2 },
    ];
    expect(eatersOn("dinner", FOUR, TOMORROW, eating)).toBe(5);
    expect(eatersOn("dinner", FOUR, TODAY, eating)).toBe(4);
    expect(eatersOn("lunch", FOUR, TOMORROW, eating)).toBe(4);
  });

  test("everyone out: nobody eats it", () => {
    const eating: Eating[] = [
      {
        on: TOMORROW,
        slot: "dinner",
        out: ["m-1", "m-2", "m-3", "m-4"],
        guests: 0,
      },
    ];
    expect(eatersOn("dinner", FOUR, TOMORROW, eating)).toBe(0);
  });

  test("a child's own dish: the children; the meal's: the adults and guests", () => {
    const family = [person("m-1"), person("m-2"), person("k-1", "child")];
    const eating: Eating[] = [
      { on: TOMORROW, slot: "lunch", out: ["m-2"], guests: 1 },
    ];
    expect(servingsOn("lunch", family, "child", TOMORROW, eating)).toBe(1);
    expect(servingsOn("lunch", family, true, TOMORROW, eating)).toBe(2);
    expect(servingsOn("lunch", family, false, TOMORROW, eating)).toBe(3);
  });
});
