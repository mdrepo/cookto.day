import { describe, expect, test } from "bun:test";
import { Screen } from "../src/index.js";
import { render } from "./render.js";

describe("Screen", () => {
  test("has a header with the page's title and tagline, then its main part", () => {
    const doc = render(
      <Screen
        title="cookto.day"
        tagline="What to cook today"
        header={<label>Language</label>}
      >
        <p>Your kitchen is empty</p>
      </Screen>,
    );
    expect(doc.querySelector("header h1")?.textContent).toBe("cookto.day");
    expect(doc.querySelector("header h1 + p")?.textContent).toBe(
      "What to cook today",
    );
    expect(doc.querySelector("header label")?.textContent).toBe("Language");
    expect(doc.querySelector("main > p")?.textContent).toBe(
      "Your kitchen is empty",
    );
  });
});
