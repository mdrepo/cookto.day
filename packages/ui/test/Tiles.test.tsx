import { describe, expect, test } from "bun:test";
import { Tiles } from "../src/index.js";
import { render } from "./render.js";

// Cards side by side when the screen has room, like lunch and dinner on a
// laptop; one above the other on a phone (#80).
describe("Tiles", () => {
  test("holds its cards in order, in one box", () => {
    const doc = render(
      <Tiles>
        <p>Lunch</p>
        <p>Dinner</p>
      </Tiles>,
    );
    const box = doc.body.firstElementChild;
    expect([...(box?.children ?? [])].map((c) => c.textContent)).toEqual([
      "Lunch",
      "Dinner",
    ]);
  });
});
