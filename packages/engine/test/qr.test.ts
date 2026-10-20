import { describe, expect, test } from "bun:test";
import {
  dataCodewords,
  formatBits,
  penalty,
  qrMatrix,
  reedSolomon,
} from "../src/qr.js";

// A QR code of the bot's link (specs/216, #217): the phone's camera opens
// Telegram on the bot. Our own small encoder: byte mode, error correction
// L or M, versions 1 to 6, the mask with the least penalty. Checked against
// the standard's known values, and scanned once by the owner.

const LINK = "https://t.me/cookto_day_bot?start=KM7Q4HTX";

/** The 7-by-7 finder pattern, as every QR code has in three corners. */
const FINDER = [
  "1111111",
  "1000001",
  "1011101",
  "1011101",
  "1011101",
  "1000001",
  "1111111",
].map((row) => Array.from(row, (c) => c === "1"));

const corner = (m: boolean[][], top: number, left: number) =>
  FINDER.map((row, r) => row.map((_, c) => m[top + r]?.[left + c] ?? false));

describe("the pieces", () => {
  test("Reed-Solomon: the standard's HELLO WORLD example, 10 codewords", () => {
    const data = [
      32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
    ];
    expect(reedSolomon(data, 10)).toEqual([
      196, 35, 39, 119, 235, 215, 231, 226, 93, 23,
    ]);
  });

  test("the format bits for level M, mask 0, are the standard's 101010000010010", () => {
    expect(formatBits("M", 0)).toBe(0b101010000010010);
    expect(formatBits("L", 0)).toBe(0b111011111000100);
  });

  test("the data codewords: mode, count, the bytes, the end, then padding", () => {
    expect(dataCodewords("ok", 1, "M")).toEqual([
      0x40, 0x26, 0xf6, 0xb0, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11,
      0xec, 0x11, 0xec, 0x11,
    ]);
  });
});

describe("the code", () => {
  test("a short text is version 1, 21 modules; the bot's link, 42 bytes, is version 3 at M, 29", () => {
    expect(qrMatrix("ok").length).toBe(21);
    expect(new TextEncoder().encode(LINK).length).toBe(42);
    const m = qrMatrix(LINK);
    expect(m.length).toBe(29);
    expect(m.every((row) => row.length === 29)).toBe(true);
  });

  test("finder patterns in three corners, timing lines, and the dark module", () => {
    const m = qrMatrix(LINK);
    const n = m.length;
    expect(corner(m, 0, 0)).toEqual(FINDER);
    expect(corner(m, 0, n - 7)).toEqual(FINDER);
    expect(corner(m, n - 7, 0)).toEqual(FINDER);
    for (let i = 8; i < n - 8; i++) {
      expect(m[6]?.[i]).toBe(i % 2 === 0);
      expect(m[i]?.[6]).toBe(i % 2 === 0);
    }
    // Below the bottom-left finder's top row, beside its separator.
    expect(m[n - 8]?.[8]).toBe(true);
    // The separators around the finders are light.
    expect(m[7]?.[7]).toBe(false);
    expect(m[7]?.[n - 8]).toBe(false);
    expect(m[n - 8]?.[7]).toBe(false);
  });

  test("the mask chosen has the least penalty of the eight", () => {
    const chosen = penalty(qrMatrix(LINK));
    for (let mask = 0; mask < 8; mask++)
      expect(chosen).toBeLessThanOrEqual(penalty(qrMatrix(LINK, "M", mask)));
  });

  test("the same text gives the same code; a different code is different", () => {
    expect(qrMatrix(LINK)).toEqual(qrMatrix(LINK));
    expect(qrMatrix(LINK)).not.toEqual(
      qrMatrix("https://t.me/cookto_day_bot?start=PR8W5JTY"),
    );
  });

  test("text too long for version 6 is refused", () => {
    expect(() => qrMatrix("x".repeat(200), "L")).toThrow();
    expect(() => qrMatrix("x".repeat(110))).toThrow();
    expect(qrMatrix("x".repeat(130), "L").length).toBe(41);
    expect(qrMatrix("x".repeat(106)).length).toBe(41);
  });
});
