import type { ListItem } from "@cookto/data";
import type { ShoppingReader } from "@cookto/data/read";
import type { ShoppingWriter } from "@cookto/data/write";
import { addBought, type Kitchen } from "./kitchen.js";

// The shopping list (specs/103): what dishes need, and anything typed, each
// once. Ticking something off puts it in the fridge, bought today.

interface Shopping {
  shopping: { reader: ShoppingReader; writer: ShoppingWriter };
}

/** Adds what isn't on the list yet; says how many it added. */
export function addToList(
  k: Shopping,
  ingredients: readonly string[],
): Promise<number> {
  return k.shopping.writer.add(ingredients);
}

/** Typed words, as typed. */
export async function addTypedToList(
  k: Shopping,
  typed: string,
): Promise<void> {
  const name = typed.trim();
  if (name) await k.shopping.writer.add([name]);
}

/** Bought: off the list, into the fridge. */
export async function bought(
  k: Shopping & Kitchen,
  item: ListItem,
  today: string,
  language: string,
): Promise<void> {
  await k.shopping.writer.remove(item.id);
  await addBought(k, item.ingredient, today, language);
}
