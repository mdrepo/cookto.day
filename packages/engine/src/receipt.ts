import { matchFood, type NameIndex, tidy } from "./names.js";
import type { Unit } from "./pantry.js";

// A receipt's lines as "Found in your receipt" shows them (specs/129): each
// line's food by its names (specs/148), its amount from the line, and what
// the household answered about it before, so a line is asked about once.

/** A line as the API sends it back, checked. */
export interface LineIn {
  name: string;
  /** A count, or a weight in kg for food sold loose. */
  qty: number;
  /** Quantity × price isn't the amount: the person should check it. */
  check: boolean;
}

/** What a household answered about a line it wasn't sure of. */
export type Answer = { food: string } | { asIs: true } | { skip: true };

/** An amount, or none: "have it". */
interface Amount {
  amount: number | null;
  unit: Unit | null;
}

export type ReceiptRow = Amount & { name: string; check: boolean } & (
    | { kind: "found"; food: string }
    | { kind: "as-is" }
    /** No food, or a word that could be several: `foods` to choose from. */
    | { kind: "not-sure"; foods: readonly string[] }
  );

/** The key an answer is kept by: the line's tidied words. */
export const answerKey = (name: string): string => tidy(name);

/** A size in a name: "200G", "1.5kg", "1L", "500 ml". */
const SIZE = /(\d+(?:[.,]\d+)?)\s*(kg|gm|g|ltr|ml|l)\b/i;
/** A count before a name: "15 Eggs". */
const COUNT = /^(\d+)\s+(?!x\b)\p{L}/iu;

const whole = (n: number) => Math.round(n * 1000) / 1000;

/** Words that say a line has no sugar: "Zero Sugar" is a drink, not sugar. */
const WITHOUT_SUGAR =
  /\b(zero|no|low|reduced)\s+(added\s+)?sugars?\b|\bsugar[\s-]*free\b|\bsugarless\b/gi;

/** A line's words as matching reads them, without what isn't food. */
const matchable = (name: string) => name.replace(WITHOUT_SUGAR, " ");

/** How much a line bought, from its name and quantity; null when it doesn't say. */
export function lineAmount(
  name: string,
  qty: number,
): { amount: number; unit: Unit } | null {
  const times = Number.isInteger(qty) && qty > 0 ? qty : 1;
  const count = COUNT.exec(name.trim());
  if (count) return { amount: Number(count[1]) * times, unit: "pieces" };
  const size = SIZE.exec(name);
  if (size) {
    const n = Number((size[1] ?? "").replace(",", "."));
    const unit = (size[2] ?? "").toLowerCase();
    const big = unit === "kg" || unit === "l" || unit === "ltr";
    const grams = unit === "kg" || unit === "g" || unit === "gm";
    return {
      amount: whole(n * (big ? 1000 : 1) * times),
      unit: grams ? "g" : "ml",
    };
  }
  if (!Number.isInteger(qty) && qty > 0)
    return { amount: whole(qty * 1000), unit: "g" };
  if (qty > 1) return { amount: qty, unit: "pieces" };
  return null;
}

/** A row "Add {n}" adds: a food, or the line's own words. */
export interface Adding {
  name: string;
  food?: string;
  amount: number | null;
  unit: Unit | null;
}

/**
 * What "Add {n}" adds: found and as-is rows still ticked, and rows it wasn't
 * sure of that were answered with a food or "Add as it is".
 */
export function rowsToAdd(
  rows: readonly ReceiptRow[],
  unticked: ReadonlySet<number>,
  answers: ReadonlyMap<number, Answer>,
): Adding[] {
  return rows.flatMap((r, i): Adding[] => {
    const { name, amount, unit } = r;
    const answer = answers.get(i);
    if (r.kind === "found")
      return unticked.has(i) ? [] : [{ name, amount, unit, food: r.food }];
    if (r.kind === "as-is")
      return unticked.has(i) ? [] : [{ name, amount, unit }];
    if (!answer || "skip" in answer) return [];
    return "food" in answer
      ? [{ name, amount, unit, food: answer.food }]
      : [{ name, amount, unit }];
  });
}

/** Each line as a row of "Found in your receipt"; skipped lines aren't shown. */
export function receiptLines(
  lines: readonly LineIn[],
  index: NameIndex,
  answers: Readonly<Record<string, Answer>>,
): ReceiptRow[] {
  const rows: ReceiptRow[] = [];
  for (const line of lines) {
    const found = lineAmount(line.name, line.qty);
    const base = {
      name: line.name,
      amount: found?.amount ?? null,
      unit: found?.unit ?? null,
      check: line.check,
    };
    const answer = answers[answerKey(line.name)];
    if (answer && "skip" in answer) continue;
    if (answer && "asIs" in answer) {
      rows.push({ kind: "as-is", ...base });
      continue;
    }
    if (answer) {
      rows.push({ kind: "found", food: answer.food, ...base });
      continue;
    }
    const match = matchFood(matchable(line.name), index);
    if (match && "food" in match)
      rows.push({ kind: "found", food: match.food, ...base });
    else rows.push({ kind: "not-sure", foods: match?.ask ?? [], ...base });
  }
  return rows;
}
