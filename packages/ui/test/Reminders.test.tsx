import { describe, expect, test } from "bun:test";
import { Reminders } from "../src/index.js";
import { render } from "./render.js";

// specs/144: what's due, each with its buttons, as a list.
const items = [
  {
    key: "a",
    text: "Tonight: soak the chickpeas, for tomorrow's lunch",
    line: "Chole",
    actions: [{ label: "Done", onPress: () => undefined }],
  },
  { key: "b", text: "Soaking since 9 pm", line: "Rajma", actions: [] },
];

describe("Reminders", () => {
  test("a list named by its label, a reminder per item, each with its words", () => {
    const doc = render(<Reminders label="Prep" items={items} />);
    const list = doc.querySelector("ul");
    expect(list?.getAttribute("aria-label")).toBe("Prep");
    const rows = [...doc.querySelectorAll("li")];
    expect(rows.map((li) => li.textContent)).toEqual([
      "Tonight: soak the chickpeas, for tomorrow's lunchCholeDone",
      "Soaking since 9 pmRajma",
    ]);
  });

  test("each action is a button in its reminder", () => {
    const doc = render(<Reminders label="Prep" items={items} />);
    const rows = doc.querySelectorAll("li");
    expect(
      [...(rows[0]?.querySelectorAll("button") ?? [])].map(
        (b) => b.textContent,
      ),
    ).toEqual(["Done"]);
    expect(rows[1]?.querySelector("button")).toBeNull();
  });

  test("nothing due, nothing shown", () => {
    const doc = render(<Reminders label="Prep" items={[]} />);
    expect(doc.querySelector("ul")).toBeNull();
  });
});
