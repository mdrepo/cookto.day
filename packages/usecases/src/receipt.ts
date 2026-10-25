import type { KitchenItem, Receipt, ReceiptsApi } from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import type { ReceiptAnswersReader, ShoppingReader } from "@cookto/data/read";
import type {
  ReceiptAnswersWriter,
  ReceiptsAgreedWriter,
  ShoppingWriter,
} from "@cookto/data/write";
import {
  type Adding,
  type Answer,
  answerKey,
  type ReceiptRow,
  receiptLines,
} from "@cookto/engine";
import type { Kitchen } from "./kitchen.js";

// Receipt photos in the app (specs/129): the photo read by our API, its
// lines as "Found in your receipt", and what's ticked added as bought on the
// receipt's day, with Undo. The household's answers about lines it wasn't
// sure of are kept, so a line is asked about once.

export interface Receipts extends Kitchen {
  shopping: { reader: ShoppingReader; writer: ShoppingWriter };
  answers: { reader: ReceiptAnswersReader; writer: ReceiptAnswersWriter };
}

/** Why a read stopped, in the words the screen has for each. */
export type Stopped =
  | "signed-out"
  | "limit-day"
  | "limit-month"
  | "not-a-receipt"
  | "rejected"
  | "unavailable";

export type Read = { ok: true; receipt: Receipt } | { ok: false; why: Stopped };

/** "Read it", the first time: this phone isn't asked again. */
export function agreeToReceipts(settings: ReceiptsAgreedWriter): void {
  settings.agreeToReceipts();
}

/** The photo, read by our API; what stopped it, when something did. */
export async function readReceiptPhoto(
  api: ReceiptsApi,
  photo: Blob,
): Promise<Read> {
  try {
    return { ok: true, receipt: await api.readReceipt(photo) };
  } catch (error) {
    if (!(error instanceof ApiError)) return { ok: false, why: "unavailable" };
    if (error.status === 401) return { ok: false, why: "signed-out" };
    if (error.status === 429 && error.detail === "household-day")
      return { ok: false, why: "limit-day" };
    if (error.status === 429 && error.detail === "household-month")
      return { ok: false, why: "limit-month" };
    if (error.code === "not-a-receipt" || error.code === "rejected")
      return { ok: false, why: error.code };
    return { ok: false, why: "unavailable" };
  }
}

const loaded = (k: Kitchen) =>
  Promise.all(k.settings.kitchen().cuisines.map((id) => k.packs.load(id)));

/** The receipt's lines as rows, by the loaded cuisines' names and the household's answers. */
export async function receiptRows(
  k: Receipts,
  receipt: Receipt,
): Promise<ReceiptRow[]> {
  const packs = await loaded(k);
  const index = {
    foods: new Map(packs.flatMap((p) => Object.entries(p.names ?? {}))),
    ask: new Map(packs.flatMap((p) => Object.entries(p.ask ?? {}))),
  };
  return receiptLines(receipt.lines, index, await k.answers.reader.answers());
}

/** What Undo takes back: the food added, and what came off the list. */
export interface Added {
  items: string[];
  unlisted: string[];
}

/**
 * Adds what's ticked or answered: fresh food bought on `boughtOn`, staples
 * as in the kitchen, the rest under its own words; what was bought comes off
 * the list. Remembers the answers given (specs/129, criterion 12).
 */
export async function addFromReceipt(
  k: Receipts,
  adding: readonly Adding[],
  answers: readonly { name: string; answer: Answer }[],
  boughtOn: string,
): Promise<Added> {
  for (const { name, answer } of answers)
    await k.answers.writer.answer(answerKey(name), answer);
  const packs = await loaded(k);
  const staples = new Set(
    packs.flatMap((p) => Object.values(p.staples).flat()),
  );
  const have = new Set(
    (await k.pantry.reader.items()).map((i) => i.ingredient),
  );
  const items: Parameters<Kitchen["pantry"]["writer"]["add"]>[0][number][] = [];
  for (const a of adding) {
    const ingredient = a.food ?? a.name;
    const days = packs
      .map((p) => (a.food ? p.fresh[a.food] : undefined))
      .find((d) => d !== undefined);
    // A staple counts as in the kitchen, once (specs/72).
    if (a.food && days === undefined && staples.has(a.food)) {
      if (!have.has(a.food)) items.push({ ingredient, boughtOn });
      have.add(a.food);
      continue;
    }
    items.push({
      ingredient,
      boughtOn,
      ...(days === undefined ? {} : { shelfLifeDays: days }),
      ...(a.amount !== null && a.unit !== null
        ? { amount: a.amount, unit: a.unit }
        : {}),
    });
  }
  const added: KitchenItem[] =
    items.length > 0 ? await k.pantry.writer.add(items) : [];
  const bought = new Set(adding.map((a) => a.food).filter(Boolean));
  const unlisted: string[] = [];
  for (const item of await k.shopping.reader.items())
    if (bought.has(item.ingredient)) {
      await k.shopping.writer.remove(item.id);
      unlisted.push(item.ingredient);
    }
  return { items: added.map((i) => i.id), unlisted };
}

/** Undo: the food added goes, and what came off the list goes back on. */
export async function undoReceipt(k: Receipts, added: Added): Promise<void> {
  for (const id of added.items) await k.pantry.writer.useUp(id);
  if (added.unlisted.length > 0) await k.shopping.writer.add(added.unlisted);
}
