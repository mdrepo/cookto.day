import { describe, expect, test } from "bun:test";
import { NextSteps } from "../src/index.js";
import { render } from "./render.js";

const steps = [
  { key: "a", label: "Choose what you cook", state: "done" as const },
  {
    key: "b",
    label: "Add the usual staples",
    state: "next" as const,
    onPress: () => undefined,
  },
  { key: "c", label: "Add what you bought", state: "later" as const },
];

describe("NextSteps", () => {
  test("is an ordered list named by its label, a step per item", () => {
    const doc = render(
      <NextSteps label="Set up your kitchen" doneLabel="Done" steps={steps} />,
    );
    const list = doc.querySelector("ol");
    expect(list?.getAttribute("aria-label")).toBe("Set up your kitchen");
    expect(list?.querySelectorAll("li").length).toBe(3);
  });

  test("only the next step is a button; a done step says so", () => {
    const doc = render(
      <NextSteps label="Set up your kitchen" doneLabel="Done" steps={steps} />,
    );
    const items = doc.querySelectorAll("li");
    expect(
      [...doc.querySelectorAll("button")].map((b) => b.textContent),
    ).toEqual(["Add the usual staples"]);
    expect(items[0]?.textContent).toContain("Done");
    expect(items[2]?.textContent).toContain("Add what you bought");
    expect(items[2]?.querySelector("button")).toBeNull();
  });
});
