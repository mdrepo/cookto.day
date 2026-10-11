import { describe, expect, test } from "bun:test";
import { Cluster } from "../src/index.js";
import { render } from "./render.js";

describe("Cluster", () => {
  test("holds its parts in order, side by side", () => {
    const doc = render(
      <Cluster>
        <span>one</span>
        <span>two</span>
      </Cluster>,
    );
    const cluster = doc.body.firstElementChild;
    expect([...(cluster?.children ?? [])].map((c) => c.textContent)).toEqual([
      "one",
      "two",
    ]);
  });

  test("a gap must be a spacing step", () => {
    // @ts-expect-error: 7 isn't a spacing step (there is no --space-7)
    expect(render(<Cluster gap={7}>x</Cluster>).body.textContent).toBe("x");
  });
});
