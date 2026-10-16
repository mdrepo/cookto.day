import { describe, expect, test } from "bun:test";
import { checkReceipt, MAX_LINES } from "../src/receipts/receipt.js";
import { MINIMART } from "./support.js";

// specs/129-receipt-photos.md, rule 6: the AI's answer is checked again by
// us, and only the shop, the date and checked item lines come back.

describe("checking what the AI read", () => {
  test("keeps the shop, the date and each line's name, quantity, price and amount, and nothing else", () => {
    const receipt = checkReceipt({
      ...MINIMART,
      cashier: "Priya",
      phone: "87553642",
      lines: [{ ...MINIMART.lines[0], member: "M-1234" }],
    });
    expect(receipt).toEqual({
      shop: "GK MINIMART",
      date: "2026-10-07",
      addsUp: false,
      lines: [
        {
          name: "VAIGAI DOSABATTER",
          qty: 1,
          unitPrice: 3.9,
          amount: 3.9,
          check: false,
        },
      ],
    });
    const all = checkReceipt(MINIMART);
    expect(all.lines).toHaveLength(11);
    expect(all.addsUp).toBe(true);
    expect(all.lines.some((line) => line.check)).toBe(false);
  });

  test("marks a line whose quantity × price isn't its amount", () => {
    const receipt = checkReceipt({
      lines: [
        { name: "BLACK BRINJAL", qty: 0.66, unitPrice: 48.6, amount: 3.25 },
        { name: "PALAK", qty: 0.41, unitPrice: 9.5, amount: 3.9 },
        { name: "TOMATO", qty: 1, amount: 3.47 },
      ],
    });
    expect(receipt.lines.map((line) => line.check)).toEqual([
      true,
      false,
      false,
    ]);
  });

  test("drops lines that make no sense, tidies names, and keeps at most 80", () => {
    const receipt = checkReceipt({
      lines: [
        { name: "  BIG\u0000 ONION\n ", qty: 1.42, amount: 3.27 },
        { name: "", qty: 1, amount: 1 },
        { name: "X".repeat(81), qty: 1, amount: 1 },
        { name: "NEGATIVE", qty: -1, amount: 1 },
        { name: "NOT A NUMBER", qty: "2", amount: 1 },
        { name: "HUGE", qty: 1, amount: 1e9 },
        { name: "INFINITE", qty: Infinity, amount: 1 },
        "TOMATO",
        null,
      ],
    });
    expect(receipt.lines.map((line) => line.name)).toEqual(["BIG ONION"]);

    const long = checkReceipt({
      lines: Array.from({ length: 120 }, (_, i) => ({
        name: `ITEM ${i}`,
        qty: 1,
        amount: 1,
      })),
    });
    expect(long.lines).toHaveLength(MAX_LINES);
    expect(MAX_LINES).toBe(80);
  });

  test("keeps a shop and date only when they're sensible", () => {
    const receipt = checkReceipt({
      shop: "S".repeat(61),
      date: "2026-02-30",
      lines: MINIMART.lines,
    });
    expect(receipt.shop).toBeUndefined();
    expect(receipt.date).toBeUndefined();
    expect(checkReceipt({ date: "7 Oct", lines: [] }).date).toBeUndefined();
  });

  test("anything that isn't a receipt has no lines", () => {
    for (const output of [null, "a poem", 42, [], { lines: "x" }, {}]) {
      expect(checkReceipt(output)).toEqual({ lines: [] });
    }
  });
});
