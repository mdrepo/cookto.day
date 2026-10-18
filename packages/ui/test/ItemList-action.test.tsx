import { describe, expect, test } from "bun:test";
import { ItemList } from "../src/index.js";
import { render } from "./render.js";

// specs/175-more.md, criterion 3: a row of My dishes has "Take out" beside
// it, a button of its own, not inside the row's.

describe("ItemList: a row's action", () => {
  test("sits beside the row's button, named for its item", () => {
    const doc = render(
      <ItemList
        label="My dishes"
        items={[
          {
            key: "poha",
            name: "Poha",
            onOpen: () => undefined,
            action: {
              label: "Take out",
              name: "Take out Poha",
              run: () => undefined,
            },
          },
          { key: "dal", name: "Dal tadka", onOpen: () => undefined },
        ]}
      />,
    );
    const [poha, dal] = [...doc.querySelectorAll("ul > li")];
    const buttons = [...(poha?.querySelectorAll(":scope > button") ?? [])];
    expect(buttons.map((b) => b.textContent)).toEqual(["Poha", "Take out"]);
    expect(buttons[1]?.getAttribute("aria-label")).toBe("Take out Poha");
    expect(dal?.querySelectorAll("button")).toHaveLength(1);
  });
});
