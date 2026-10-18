import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/97-cook-now.md: dishes you can cook now come first.

/** "Needs 3 things" as 3, "Has everything" as 0. */
const needs = (text: string) => Number(/Needs (\d+)/.exec(text)?.[1] ?? 0);
const names = (texts: string[]) =>
  texts.map(
    (t) =>
      /^[^\n]*?(?=Lunch|Breakfast|Morning|Evening|Dinner)/.exec(t)?.[0] ?? t,
  );

test.describe("Cook now", () => {
  test("Dishes: ready first, then the closest", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    for (const food of [
      "Spinach",
      "Paneer",
      "Potato",
      "Green chilli",
      "Coriander leaves",
      "Ginger",
    ])
      await k.add(food);
    await k.tabs().getByRole("button", { name: "Dishes", exact: true }).click();
    await expect(k.title()).toHaveText("Dishes");

    const ready = await k.dishGroup("You can cook now").allTextContents();
    expect(ready.length).toBeGreaterThan(0);
    for (const row of ready) expect(row).toContain("Has everything");
    // The reviewed recipes (#149): both take ginger, and nothing else fresh.
    expect(names(ready)).toContain("Aloo paratha");
    expect(names(ready)).toContain("Aloo tikki");
    expect(names(ready)).toEqual([...names(ready)].sort());

    const rest = await k.dishGroup("Need a few things").allTextContents();
    expect(ready.length + rest.length).toBe(28);
    const counts = rest.map(needs);
    for (const [i, n] of counts.entries()) {
      expect(n).toBeGreaterThan(0);
      if (i > 0) expect(n).toBeGreaterThanOrEqual(counts[i - 1] ?? 0);
    }
  });

  test("Today says how many you can cook", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    await expect(
      page.getByRole("button", { name: /^You can cook/ }),
    ).toHaveCount(0);

    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    for (const food of ["Potato", "Green chilli", "Coriander leaves", "Ginger"])
      await k.add(food);
    await k.home();
    const cookNow = page.getByRole("button", {
      name: /^You can cook \d+ dish(es)? now$/,
    });
    await expect(cookNow).toBeVisible();
    const shown = Number(
      /(\d+)/.exec((await cookNow.textContent()) ?? "")?.[1],
    );
    expect(shown).toBe(2); // aloo paratha and aloo tikki (#149)
    await cookNow.click();
    await expect(k.title()).toHaveText("Dishes");
    await expect(k.dishGroup("You can cook now")).toHaveCount(shown);
  });
});
