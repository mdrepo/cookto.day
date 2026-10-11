import { describe, expect, test } from "bun:test";
import { Stack } from "../src/index.js";
import { render } from "./render.js";

describe("Stack", () => {
  test("holds its parts in order, one above the other", () => {
    const doc = render(
      <Stack gap={2}>
        <p>one</p>
        <p>two</p>
      </Stack>,
    );
    const stack = doc.body.firstElementChild;
    expect(stack?.tagName).toBe("DIV");
    expect([...(stack?.children ?? [])].map((c) => c.textContent)).toEqual([
      "one",
      "two",
    ]);
  });

  test("a gap must be a spacing step", () => {
    // @ts-expect-error: 5 isn't a spacing step (there is no --space-5)
    expect(render(<Stack gap={5}>x</Stack>).body.textContent).toBe("x");
  });
});
