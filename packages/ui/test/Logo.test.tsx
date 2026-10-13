import { describe, expect, test } from "bun:test";
import { Logo } from "../src/index.js";
import { render } from "./render.js";

// The pot, the app's logo, as the prototype draws it in its warm cards.

describe("Logo", () => {
  test("is decoration unless it's given a label", () => {
    const quiet = render(<Logo />).querySelector("img");
    expect(quiet?.getAttribute("alt")).toBe("");
    expect(quiet?.getAttribute("src")).toMatch(/\.svg$/);

    const named = render(<Logo label="cookto.day" />).querySelector("img");
    expect(named?.getAttribute("alt")).toBe("cookto.day");
  });
});
