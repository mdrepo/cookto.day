import {
  createChanges,
  createPantry,
  createReceiptAnswers,
  createShopping,
  type PackLoader,
} from "@cookto/data";
import type { Households } from "@cookto/db";
import type { Receipts } from "@cookto/usecases/receipt";
import { householdStore } from "./record-store.js";
import { cuisinesOf, packOf } from "./tomorrow-plan.js";

// The household's kitchen as the app's receipt use cases take it
// (specs/277): its pantry, shopping list and answers, on the server's
// records; its cuisines, read from its settings and never changed here.

export async function receiptKitchen(
  households: Households,
  household: string,
  now: () => string,
  packs?: PackLoader,
): Promise<Receipts> {
  const store = householdStore(households, household, now);
  const o = { changes: createChanges(), now };
  const cuisines = await cuisinesOf(households, household);
  return {
    pantry: createPantry(store, o),
    shopping: createShopping(store, o),
    answers: createReceiptAnswers(store, o),
    settings: {
      kitchen: () => ({ cuisines, skip: [], sample: null }),
      setKitchen: () => undefined,
      moves: () => [],
      setMoves: () => undefined,
    },
    packs: {
      cuisines: () => [],
      load: async (id) => {
        const pack = await packOf(id, packs);
        if (!pack) throw new Error(`no-pack:${id}`);
        return pack;
      },
    },
  };
}
