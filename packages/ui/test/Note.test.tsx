import { describe, expect, test } from "bun:test";
import { Note } from "../src/index.js";
import { render } from "./render.js";

describe("Note", () => {
  test("is a paragraph of quiet text", () => {
    const doc = render(<Note>Nothing is uploaded.</Note>);
    expect(doc.querySelector("p")?.textContent).toBe("Nothing is uploaded.");
  });
});
