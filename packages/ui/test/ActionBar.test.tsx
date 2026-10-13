import { describe, expect, test } from "bun:test";
import { ActionBar, Button } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md: Back and Next at the bottom, within the thumb's
// reach, and anything else (Skip for now) below them.

describe("ActionBar", () => {
  test("holds its actions in order, side by side, and anything else below", () => {
    const doc = render(
      <ActionBar
        below={
          <Button kind="plain" onClick={() => undefined}>
            Skip for now
          </Button>
        }
      >
        <Button kind="quiet">Back</Button>
        <Button>Next</Button>
      </ActionBar>,
    );
    const buttons = [...doc.querySelectorAll("button")].map(
      (b) => b.textContent,
    );
    expect(buttons).toEqual(["Back", "Next", "Skip for now"]);
  });

  test("without anything below, it's just the actions", () => {
    const doc = render(
      <ActionBar>
        <Button>Go to my kitchen</Button>
      </ActionBar>,
    );
    expect(doc.querySelectorAll("button").length).toBe(1);
  });
});
