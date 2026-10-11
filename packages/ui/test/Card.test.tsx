import { describe, expect, test } from "bun:test";
import { Card } from "../src/index.js";
import { render, textOf } from "./render.js";

describe("Card", () => {
  test("is an article named by its title, holding its contents", () => {
    const doc = render(
      <Card title="Palak paneer">
        <p>Spinach: use by tomorrow</p>
      </Card>,
    );
    const article = doc.querySelector("article");
    expect(textOf(doc, article?.getAttribute("aria-labelledby") ?? null)).toBe(
      "Palak paneer",
    );
    expect(article?.querySelector("p")?.textContent).toBe(
      "Spinach: use by tomorrow",
    );
  });

  test("its title is a heading, level 3 unless the screen says otherwise", () => {
    expect(
      render(<Card title="Palak paneer">x</Card>).querySelector("h3"),
    ).not.toBeNull();
    expect(
      render(
        <Card title="Palak paneer" level={2}>
          x
        </Card>,
      ).querySelector("h2"),
    ).not.toBeNull();
  });
});
