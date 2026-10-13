import { describe, expect, test } from "bun:test";
import { Card } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md, criterion 3: each person's card has its remove
// button beside its name, not on a line of its own.

describe("Card with an action", () => {
  test("the action follows the title, on the title's line", () => {
    const doc = render(
      <Card title="Adult" action={<button type="button">Remove</button>}>
        <p>Lunch</p>
      </Card>,
    );
    const heading = doc.querySelector("h3");
    const line = heading?.parentElement;
    expect(line?.tagName).not.toBe("ARTICLE");
    expect([...(line?.children ?? [])].map((c) => c.textContent)).toEqual([
      "Adult",
      "Remove",
    ]);
  });
});
