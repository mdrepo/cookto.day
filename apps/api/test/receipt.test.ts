import { describe, expect, test } from "bun:test";
import {
  checkReceipt,
  MAX_LINES,
  signOfAbuse,
} from "../src/receipts/receipt.js";
import { MINIMART } from "./support.js";

// specs/129-receipt-photos.md, rule 6: the AI's answer is checked again by
// us, and only the shop, the date and checked item lines come back.

describe("checking what the AI read", () => {
  test("keeps the shop, the date and each row's name, quantity, price and amount, and nothing else", () => {
    const receipt = checkReceipt({
      ...MINIMART,
      cashier: "TEST",
      phone: "6123 4567",
      lines: ["PALAK|0.41|9.50|3.90", "DOSA BATTER|1||3.90"],
    });
    expect(receipt).toEqual({
      shop: "SUNRISE MINIMART",
      date: "2026-10-02",
      addsUp: false,
      lines: [
        { name: "PALAK", qty: 0.41, unitPrice: 9.5, amount: 3.9, check: false },
        { name: "DOSA BATTER", qty: 1, amount: 3.9, check: false },
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
        "BLACK BRINJAL|0.66|48.60|3.25",
        "PALAK|0.41|9.50|3.90",
        "TOMATO|1||3.47",
      ],
    });
    expect(receipt.lines.map((line) => line.check)).toEqual([
      true,
      false,
      false,
    ]);
  });

  test("reads rows leniently, drops rows that make no sense, tidies names, and keeps at most 80", () => {
    const receipt = checkReceipt({
      lines: [
        "  BIG\u0000 ONION\n |1.42|2.30|3.27",
        "GARDENIA BREAD|||4.20",
        "BANANA|0.912kg|$2.98|$2.72",
        "|1||1.00",
        `${"X".repeat(81)}|1||1.00`,
        "PROMO DISCOUNT|1||-0.80",
        "NO QUANTITY|0||1.00",
        "NOT A NUMBER|two||1.00",
        "HUGE|1||1000000",
        "TOO|MANY|FIELDS|1|1",
        "TOO FEW|1",
        { name: "TOMATO", qty: 1, amount: 1 },
        null,
      ],
    });
    expect(receipt.lines).toEqual([
      {
        name: "BIG ONION",
        qty: 1.42,
        unitPrice: 2.3,
        amount: 3.27,
        check: false,
      },
      { name: "GARDENIA BREAD", qty: 1, amount: 4.2, check: false },
      {
        name: "BANANA",
        qty: 0.912,
        unitPrice: 2.98,
        amount: 2.72,
        check: false,
      },
    ]);

    const long = checkReceipt({
      lines: Array.from({ length: 120 }, (_, i) => `ITEM ${i}|1||1.00`),
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
    for (const shop of ["WWW.SHOP.EXAMPLE.COM", "CALL 6123 4567"])
      expect(
        checkReceipt({ shop, lines: MINIMART.lines }).shop,
      ).toBeUndefined();
  });

  test("anything that isn't a receipt has no lines", () => {
    for (const output of [null, "a poem", 42, [], { lines: "x" }, {}]) {
      expect(checkReceipt(output)).toEqual({ lines: [] });
    }
  });
});

// specs/129-receipt-photos.md, rule 8: an answer an honest receipt can't
// produce is a sign of abuse, and ends the household's day.

describe("signs of abuse in what the AI read", () => {
  test("a row over 120 characters, or a link, an email or a long number in a name", () => {
    const answer = (...lines: string[]) => ({ ...MINIMART, lines });
    expect(signOfAbuse(MINIMART)).toBeUndefined();
    for (const name of [
      "REFUND CALL +65 9123 4567",
      "HOTLINE 9123-4567",
      "CARD 4111 1111 1111 1111",
      "CLAIM AT WWW.PRIZE.EXAMPLE",
      "SEE HTTPS://PRIZE.EXAMPLE",
      "PRIZE.COM",
      "MAIL WIN@PRIZE.SG",
    ])
      expect(signOfAbuse(answer("TOMATO|1||1.60", `${name}|1||0.00`))).toBe(
        "contact",
      );
    expect(signOfAbuse(answer(`${"A".repeat(113)}|1||1.00`))).toBe("long-line");
  });

  test("odd but honest rows, or no receipt at all, aren't a sign", () => {
    expect(
      signOfAbuse({
        lines: [
          `${"A".repeat(112)}|1||1.00`,
          "GARDENIA BREAD|||4.20",
          "BANANA|0.912kg|2.98|2.72",
          "PROMO DISCOUNT|1||-0.80",
          "MILO 3IN1 18X33G|1||7.95",
          "EGGS 10S 2 @ 2.10|2||4.20",
          "COKE 1.5L X 2|1||5.40",
          "TOO FEW|1",
        ],
      }),
    ).toBeUndefined();
    for (const output of [null, "a poem", { lines: "x" }, { lines: [] }])
      expect(signOfAbuse(output)).toBeUndefined();
  });
});
