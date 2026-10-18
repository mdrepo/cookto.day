import type { MyDishesReader } from "@cookto/data/read";
import type { MyDishesWriter } from "@cookto/data/write";

// My dishes (specs/175): what this family cooks; only those are planned.
// Taking a dish out keeps what was cooked, the fridge and the list.

interface MyDishes {
  myDishes: { reader: MyDishesReader; writer: MyDishesWriter };
}

/** "Take out": not one this family cooks. */
export async function takeOutOfMyDishes(
  k: MyDishes,
  dish: string,
): Promise<void> {
  await k.myDishes.writer.takeOut(dish);
}

/** "Add": back in My dishes, with its history. */
export async function addToMyDishes(k: MyDishes, dish: string): Promise<void> {
  await k.myDishes.writer.add(dish);
}
