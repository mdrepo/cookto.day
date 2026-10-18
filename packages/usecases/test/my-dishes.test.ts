import { describe, expect, test } from "bun:test";
import {
  createChanges,
  createCooked,
  createMyDishes,
  memoryRecordStore,
} from "@cookto/data";
import { cookedIt } from "../src/cooked.js";
import { addToMyDishes, takeOutOfMyDishes } from "../src/my-dishes.js";

// specs/175-more.md, criterion 3: taking a dish out keeps what was cooked;
// adding it back brings its history with it.

function kitchen() {
  const store = memoryRecordStore();
  const changes = createChanges();
  return {
    myDishes: createMyDishes(store, { changes }),
    cooked: createCooked(store, { changes }),
  };
}

describe("taking a dish out of My dishes, and back", () => {
  test("out, then back, still cooked today", async () => {
    const k = kitchen();
    await cookedIt(k, "poha", "2026-10-18");
    await takeOutOfMyDishes(k, "poha");
    expect(await k.myDishes.reader.takenOut()).toEqual(["poha"]);
    await addToMyDishes(k, "poha");
    expect(await k.myDishes.reader.takenOut()).toEqual([]);
    expect((await k.cooked.reader.all()).map((c) => [c.dish, c.on])).toEqual([
      ["poha", "2026-10-18"],
    ]);
  });
});
