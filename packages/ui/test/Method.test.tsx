import { describe, expect, test } from "bun:test";
import { Method } from "../src/index.js";
import { render } from "./render.js";

// specs/149: a dish's steps, numbered, in our own words.
const steps = ["Rinse the dal.", "Boil it until soft.", "Fry the cumin."];

describe("Method", () => {
  test("is an ordered list named by its label, a step per item, in order", () => {
    const doc = render(<Method label="Steps" steps={steps} />);
    const list = doc.querySelector("ol");
    expect(list?.getAttribute("aria-label")).toBe("Steps");
    expect([...doc.querySelectorAll("li")].map((li) => li.textContent)).toEqual(
      ["1Rinse the dal.", "2Boil it until soft.", "3Fry the cumin."],
    );
  });

  test("the numbers are for the eye; screen readers count the list themselves", () => {
    const doc = render(<Method label="Steps" steps={steps} />);
    const marks = doc.querySelectorAll('li [aria-hidden="true"]');
    expect(marks.length).toBe(3);
  });

  test("no steps, no list", () => {
    const doc = render(<Method label="Steps" steps={[]} />);
    expect(doc.querySelector("ol")).toBeNull();
  });
});
