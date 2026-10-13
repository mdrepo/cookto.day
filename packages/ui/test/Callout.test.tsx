import { describe, expect, test } from "bun:test";
import { Callout } from "../src/index.js";
import { render } from "./render.js";

// #84, criterion 3: the prototype's warm card.

describe("Callout", () => {
  test("is a region named by its title, with its sentence and buttons inside", () => {
    const doc = render(
      <Callout
        title="Sample kitchen"
        actions={<button type="button">Clear the sample</button>}
      >
        Pretend food, so you can look around.
      </Callout>,
    );
    const card = doc.querySelector("section");
    const title = doc.getElementById(
      card?.getAttribute("aria-labelledby") ?? "",
    );
    expect(title?.textContent).toBe("Sample kitchen");
    expect(card?.querySelector("p")?.textContent).toBe(
      "Pretend food, so you can look around.",
    );
    expect(card?.querySelector("button")?.textContent).toBe("Clear the sample");
  });

  test("can show art, like the logo, before its title", () => {
    const doc = render(
      <Callout title="Sample kitchen" art={<img alt="" src="pot.svg" />}>
        Pretend food, so you can look around.
      </Callout>,
    );
    const card = doc.querySelector("section");
    const img = card?.querySelector("img");
    expect(img?.getAttribute("src")).toBe("pot.svg");
    expect(
      img?.compareDocumentPosition(card?.querySelector("h2") as Node),
    ).toBe(4); // the title follows the art
  });
});
