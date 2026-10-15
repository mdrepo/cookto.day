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

  test("folded, it's one line: a button with its title and summary, still named by its title", () => {
    const doc = render(
      <Card
        title="Adult 1"
        folded={{ summary: "Lunch, Dinner", onOpen: () => undefined }}
      >
        <p>Name</p>
      </Card>,
    );
    const article = doc.querySelector("article");
    expect(textOf(doc, article?.getAttribute("aria-labelledby") ?? null)).toBe(
      "Adult 1",
    );
    const button = article?.querySelector("button[aria-expanded='false']");
    expect(button?.textContent).toContain("Adult 1");
    expect(button?.textContent).toContain("Lunch, Dinner");
    expect(article?.querySelector("p")).toBeNull();
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
