import { describe, expect, test } from "bun:test";
import { nameIndex } from "../src/names.js";
import {
  answerKey,
  lineAmount,
  receiptLines,
  rowsToAdd,
} from "../src/receipt.js";

// specs/129, criteria 10 and 12: a receipt's lines as "Found in your
// receipt" shows them. Each line's food by its names (specs/148), its amount
// from the line, and a household's earlier answers.

const index = nameIndex(
  [
    { id: "paneer", names: ["Paneer"] },
    { id: "onion", names: ["Onion", "red onion"] },
    { id: "egg", names: ["Egg"] },
    { id: "tomato", names: ["Tomato"] },
    { id: "ginger", names: ["Ginger"] },
    { id: "green-chilli", names: ["Green chilli"] },
    { id: "red-chilli", names: ["Red chilli"] },
  ],
  { chilli: ["green-chilli", "red-chilli"] },
);

const line = (name: string, qty = 1, check = false) => ({ name, qty, check });

describe("a receipt line's amount", () => {
  test("a size in the name, times how many were bought", () => {
    expect(lineAmount("Fresh Paneer 200G", 4)).toEqual({
      amount: 800,
      unit: "g",
    });
    expect(lineAmount("Red Onions 700G", 1)).toEqual({
      amount: 700,
      unit: "g",
    });
    expect(lineAmount("Milk 1L", 2)).toEqual({ amount: 2000, unit: "ml" });
    expect(lineAmount("Atta 1.5kg", 1)).toEqual({ amount: 1500, unit: "g" });
  });

  test("a count before the name, or how many were bought", () => {
    expect(lineAmount("15 Eggs", 1)).toEqual({ amount: 15, unit: "pieces" });
    expect(lineAmount("15 Eggs 15 X 60G", 1)).toEqual({
      amount: 15,
      unit: "pieces",
    });
    expect(lineAmount("Lemons", 3)).toEqual({ amount: 3, unit: "pieces" });
  });

  test("food sold by weight: a quantity in kilograms", () => {
    expect(lineAmount("Loose Ginger", 0.15)).toEqual({
      amount: 150,
      unit: "g",
    });
  });

  test('one of something with no size: no amount, "have it"', () => {
    expect(lineAmount("Local Tomatoes", 1)).toBeNull();
  });
});

describe("Found in your receipt", () => {
  test("lines that name a food are found, with their amounts; the rest aren't sure", () => {
    expect(
      receiptLines(
        [
          line("Fresh Paneer 200G", 4),
          line("Red Onions 700G"),
          line("15 Eggs"),
          line("Local Tomatoes"),
          line("Loose Ginger", 0.15, true),
          line("Velvet Almond Milk Drink"),
          line("Chilli 100G"),
        ],
        index,
        {},
      ),
    ).toEqual([
      {
        kind: "found",
        name: "Fresh Paneer 200G",
        food: "paneer",
        amount: 800,
        unit: "g",
        check: false,
      },
      {
        kind: "found",
        name: "Red Onions 700G",
        food: "onion",
        amount: 700,
        unit: "g",
        check: false,
      },
      {
        kind: "found",
        name: "15 Eggs",
        food: "egg",
        amount: 15,
        unit: "pieces",
        check: false,
      },
      {
        kind: "found",
        name: "Local Tomatoes",
        food: "tomato",
        amount: null,
        unit: null,
        check: false,
      },
      {
        kind: "found",
        name: "Loose Ginger",
        food: "ginger",
        amount: 150,
        unit: "g",
        check: true,
      },
      {
        kind: "not-sure",
        name: "Velvet Almond Milk Drink",
        foods: [],
        amount: null,
        unit: null,
        check: false,
      },
      {
        kind: "not-sure",
        name: "Chilli 100G",
        foods: ["green-chilli", "red-chilli"],
        amount: 100,
        unit: "g",
        check: false,
      },
    ]);
  });

  test("a household's answers: as it is, skipped, or a food, and not asked again (12)", () => {
    const answers = {
      [answerKey("Velvet Almond Milk Drink")]: { asIs: true as const },
      [answerKey("Coca-Cola Zero Sugar")]: { skip: true as const },
      [answerKey("Chilli 100G")]: { food: "green-chilli" },
    };
    expect(
      receiptLines(
        [
          line("Velvet Almond Milk Drink"),
          line("Coca-Cola Zero Sugar", 2),
          line("CHILLI 100g"),
        ],
        index,
        answers,
      ),
    ).toEqual([
      {
        kind: "as-is",
        name: "Velvet Almond Milk Drink",
        amount: null,
        unit: null,
        check: false,
      },
      {
        kind: "found",
        name: "CHILLI 100g",
        food: "green-chilli",
        amount: 100,
        unit: "g",
        check: false,
      },
    ]);
  });

  test("an answer is kept by the line's tidied words, whatever its sizes and case", () => {
    expect(answerKey("Velvet Almond Milk Drink 1L")).toBe(
      answerKey("VELVET almond milk drink"),
    );
  });
});

describe("what Add adds (11)", () => {
  test("ticked rows, and the lines answered with a food or as it is; not skipped or unanswered ones", () => {
    const rows = receiptLines(
      [
        line("Fresh Paneer 200G", 4),
        line("Local Tomatoes"),
        line("Velvet Almond Milk Drink"),
        line("Coca-Cola Zero Sugar"),
        line("Chilli 100G"),
        line("Mystery Snack"),
      ],
      index,
      {},
    );
    expect(
      rowsToAdd(
        rows,
        new Set([1]),
        new Map([
          [2, { asIs: true as const }],
          [3, { skip: true as const }],
          [4, { food: "red-chilli" }],
        ]),
      ),
    ).toEqual([
      { name: "Fresh Paneer 200G", food: "paneer", amount: 800, unit: "g" },
      { name: "Velvet Almond Milk Drink", amount: null, unit: null },
      { name: "Chilli 100G", food: "red-chilli", amount: 100, unit: "g" },
    ]);
  });
});
