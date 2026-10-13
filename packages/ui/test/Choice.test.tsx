import { describe, expect, test } from "bun:test";
import { Choice } from "../src/index.js";
import { render, textOf } from "./render.js";

// specs/65-onboarding.md, criterion 1: one answer from a few cards, some of
// which may be coming soon.

const places = [
  { value: "sg", title: "Singapore", detail: "S$ · RedMart" },
  { value: "in", title: "India", detail: "₹ · Blinkit", soon: "Coming soon" },
];

const doc = () =>
  render(
    <Choice
      legend="Where do you live?"
      name="country"
      value="sg"
      options={places}
      onChange={() => undefined}
    />,
  );

describe("Choice", () => {
  test("is a group named by its question", () => {
    const group = doc().querySelector("fieldset");
    expect(group?.querySelector("legend")?.textContent).toBe(
      "Where do you live?",
    );
  });

  test("each card is a radio button named by its title", () => {
    const radios = [...doc().querySelectorAll('input[type="radio"]')];
    expect(radios.map((r) => r.getAttribute("name"))).toEqual([
      "country",
      "country",
    ]);
    const names = radios.map(
      (r) => r.closest("label")?.querySelector("strong")?.textContent,
    );
    expect(names).toEqual(["Singapore", "India"]);
  });

  test("the chosen card is checked", () => {
    const radios = [
      ...doc().querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ];
    expect(radios.map((r) => r.hasAttribute("checked"))).toEqual([true, false]);
  });

  test("a card that's coming soon can't be chosen, and says why", () => {
    const d = doc();
    const india = d.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    )[1];
    expect(india?.disabled).toBe(true);
    expect(
      textOf(d, india?.getAttribute("aria-describedby") ?? null),
    ).toContain("Coming soon");
  });
});
