import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/72-kitchen.md, criteria 4 and 7: food that needs using gets the warm
// warning colour, the one thing on a screen allowed to stand out (DESIGN.md).

test.describe("A warning tag", () => {
  test("is drawn in the warning colour, words and border, in both themes", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, words] of [
      ["Light, English", "Past its best"],
      ["Dark, English", "Past its best"],
      ["Light, Arabic", "تجاوز أفضل حالاته"],
    ] as const) {
      const tag = kit
        .example(kit.panel("Tag", panel), "Warning")
        .getByText(words);
      const drawn = await kit.drawn(tag);
      const warn = await kit.token(tag, "warn");
      expect(drawn.colour, panel).toBe(warn);
      expect(drawn.borderColour, panel).toBe(warn);
      expect(drawn.borderStyle, panel).toBe("solid");
    }
  });
});
