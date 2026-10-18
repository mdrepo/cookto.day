import { describe, expect, test } from "bun:test";
import type { ComponentProps } from "react";
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
    // 7 isn't a spacing step (there is no --space-7): if it were, this
    // line wouldn't compile.
    type Gap = NonNullable<ComponentProps<typeof Cluster>["gap"]>;
    const gap: 7 extends Gap ? "a step" : "not a step" = "not a step";
    expect(gap).toBe("not a step");
  });
});
