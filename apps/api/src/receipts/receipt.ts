// specs/129-receipt-photos.md, rule 6: we never trust the AI's answer. Its
// shape, lengths and numbers are checked again here, and only the shop, the
// date and the item lines go back, so nothing else it says reaches anyone.

export const MAX_LINES = 80;
const MAX_NAME = 80;
const MAX_SHOP = 60;
const MAX_MONEY = 100_000;
const MAX_QTY = 1_000;

export interface ReceiptLine {
  name: string;
  /** A count, or a weight in kg for food sold loose. */
  qty: number;
  unitPrice?: number;
  amount: number;
  /** Quantity × price isn't the amount: the person should check it. */
  check: boolean;
}

export interface Receipt {
  shop?: string;
  /** YYYY-MM-DD */
  date?: string;
  lines: ReceiptLine[];
  /** Whether the lines add up to the printed subtotal, when there is one. */
  addsUp?: boolean;
}

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Printable text, one line, within a length; anything else is dropped. */
function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/\p{C}/gu, " ").replace(/\s+/g, " ").trim();
  return clean.length > 0 && clean.length <= max ? clean : undefined;
}

function number(value: unknown, min: number, max: number) {
  return typeof value === "number" && value >= min && value <= max
    ? value
    : undefined;
}

/** A real calendar date, written YYYY-MM-DD. */
function date(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().startsWith(value)
    ? value
    : undefined;
}

/** Within a cent or two, or 1% on big amounts: receipts round. */
const near = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(0.02, Math.abs(b) * 0.01);

function line(value: unknown): ReceiptLine | undefined {
  if (!isFields(value)) return undefined;
  const name = text(value["name"], MAX_NAME);
  const qty = number(value["qty"], Number.MIN_VALUE, MAX_QTY);
  const amount = number(value["amount"], 0, MAX_MONEY);
  if (name === undefined || qty === undefined || amount === undefined)
    return undefined;
  const unitPrice = number(value["unitPrice"], 0, MAX_MONEY);
  if (unitPrice === undefined) return { name, qty, amount, check: false };
  return {
    name,
    qty,
    unitPrice,
    amount,
    check: !near(qty * unitPrice, amount),
  };
}

export function checkReceipt(output: unknown): Receipt {
  if (!isFields(output) || !Array.isArray(output["lines"]))
    return { lines: [] };
  const lines = output["lines"]
    .map(line)
    .filter((l) => l !== undefined)
    .slice(0, MAX_LINES);
  const receipt: Receipt = { lines };
  const shop = text(output["shop"], MAX_SHOP);
  if (shop !== undefined) receipt.shop = shop;
  const on = date(output["date"]);
  if (on !== undefined) receipt.date = on;
  const subtotal = number(output["subtotal"], 0, MAX_MONEY * MAX_LINES);
  if (subtotal !== undefined && lines.length > 0) {
    const sum = lines.reduce((total, l) => total + l.amount, 0);
    receipt.addsUp = near(sum, subtotal);
  }
  return receipt;
}
