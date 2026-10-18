import { describe, expect, test } from "bun:test";
import {
  cookTodayForMeals,
  type Dish,
  type Plan,
  type Prep,
  type PrepEvent,
  prepEvents,
  prepFor,
  waitingForPrep,
} from "../src/index.js";

// specs/144-prep.md: prep is data on a dish; the engine works out what's due,
// as events any channel can show (the app's screen first).

const soak: Prep = { do: "soak", what: "chickpeas", hours: 8, tinned: true };
const marinate: Prep = { do: "marinate", what: "paneer", hours: 1 };
const chole: Dish = {
  id: "chole",
  slots: ["lunch", "dinner"],
  ingredients: ["chickpeas"],
  prep: [soak],
};
const tikka: Dish = {
  id: "paneer-tikka",
  slots: ["dinner"],
  ingredients: ["paneer"],
  prep: [marinate],
};
const dal: Dish = { id: "dal", slots: ["lunch", "dinner"], ingredients: [] };
const pulao: Dish = {
  id: "pulao",
  slots: ["lunch", "dinner"],
  ingredients: [],
};
const dishes = [chole, tikka, dal];

describe("prep", () => {
  test("tinned beans need no soak; other prep stays", () => {
    expect(prepFor(chole, "dried")).toEqual([soak]);
    expect(prepFor(chole, "tinned")).toEqual([]);
    expect(prepFor(tikka, "tinned")).toEqual([marinate]);
    expect(prepFor(dal, "dried")).toEqual([]);
  });

  test("a dish whose prep starts the day before waits until it's done; an hour's marinade doesn't", () => {
    expect(waitingForPrep(dishes, "dried", new Set())).toEqual(
      new Set(["chole"]),
    );
    expect(waitingForPrep(dishes, "dried", new Set(["chole"]))).toEqual(
      new Set(),
    );
    expect(waitingForPrep(dishes, "tinned", new Set())).toEqual(new Set());
  });

  test("a dish waiting for prep is no meal's pick, but stays an idea (#144, 1)", () => {
    const meals = cookTodayForMeals({
      slots: ["lunch", "dinner"],
      dishes: [chole, dal, pulao],
      pantry: [],
      staples: new Set(["chickpeas"]),
      today: "2026-10-18",
      avoid: waitingForPrep([chole, dal, pulao], "dried", new Set()),
    });
    expect(meals.map((m) => m.suggestions[0]?.dish.id)).toEqual([
      "dal",
      "pulao",
    ]);
    expect(meals[0]?.suggestions.map((s) => s.dish.id)).toContain("chole");
  });

  test("a planned dish is its meal's pick (#144, 3)", () => {
    const meals = cookTodayForMeals({
      slots: ["lunch"],
      dishes: [dal, chole],
      pantry: [],
      staples: new Set(["chickpeas"]),
      today: "2026-10-18",
      planned: { lunch: "chole" },
    });
    expect(meals[0]?.suggestions[0]?.dish.id).toBe("chole");
  });
});

describe("prep events", () => {
  const plan = (on: string, over: Partial<Plan> = {}): Plan => ({
    on,
    slot: "lunch",
    dish: "chole",
    prep: null,
    ...over,
  });
  const at = (now: string, plans: Plan[]) =>
    prepEvents({ now, plans, dishes, beans: "dried" });

  test("from 4 pm, tomorrow's prep is due tonight (#144, 2)", () => {
    const plans = [plan("2026-10-19")];
    expect(at("2026-10-18T15:59", plans)).toEqual([]);
    expect(at("2026-10-18T16:00", plans)).toEqual([
      {
        kind: "tonight",
        dish: "chole",
        on: "2026-10-19",
        slot: "lunch",
        prep: [soak],
      },
    ]);
  });

  test("prep marked done says since when, until the meal's day is over (#144, 2)", () => {
    const done = [plan("2026-10-19", { prep: "done", since: "21:00" })];
    const event: PrepEvent = {
      kind: "under-way",
      dish: "chole",
      on: "2026-10-19",
      slot: "lunch",
      prep: [soak],
      since: "21:00",
    };
    expect(at("2026-10-18T21:05", done)).toEqual([event]);
    expect(at("2026-10-19T11:00", done)).toEqual([event]);
    expect(at("2026-10-20T08:00", done)).toEqual([]);
  });

  test("the morning after, unmarked prep is a question; 'No' ends it (#144, 3)", () => {
    expect(at("2026-10-19T08:00", [plan("2026-10-19")])).toEqual([
      {
        kind: "ask",
        dish: "chole",
        on: "2026-10-19",
        slot: "lunch",
        prep: [soak],
      },
    ]);
    expect(
      at("2026-10-19T08:00", [plan("2026-10-19", { prep: "skipped" })]),
    ).toEqual([]);
  });

  test("no events for a dish with no day-before prep, or with tinned beans", () => {
    expect(
      at("2026-10-18T17:00", [plan("2026-10-19", { dish: "dal" })]),
    ).toEqual([]);
    expect(
      prepEvents({
        now: "2026-10-18T17:00",
        plans: [plan("2026-10-19")],
        dishes,
        beans: "tinned",
      }),
    ).toEqual([]);
  });
});
