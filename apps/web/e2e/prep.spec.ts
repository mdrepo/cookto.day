import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/144-prep.md: a dish that needs soaking isn't tonight's pick; the
// evening before says what to do; the morning after asks if it was done.

/** The household's clock, "YYYY-MM-DDTHH:MM", in the phone's own time. */
const at = (page: Page, time: string) =>
  page.clock.setFixedTime(new Date(`${time}:00`));

/** A kitchen where chole would be lunch's pick, if its beans were soaked. */
async function cholesKitchen(page: Page): Promise<Cooking> {
  const k = new Cooking(page);
  await k.start();
  await k.loadNorthIndianWithStaples();
  for (const food of [
    "Onion",
    "Tomato",
    "Ginger",
    "Garlic",
    "Green chilli",
    "Coriander leaves",
  ])
    await k.add(food);
  return k;
}

/** Back to Today after the clock moved, as when the app is opened again. */
async function reopen(page: Page, k: Cooking): Promise<void> {
  await page.reload();
  await k.home();
}

const tomorrow = (page: Page) => page.getByRole("region", { name: "Tomorrow" });

/** Tomorrow shows on the planner's phone (specs/195): this one plans. */
async function planner(k: Cooking, page: Page): Promise<void> {
  await k.settings();
  await page.getByRole("radio", { name: "I plan the meals" }).click();
  await k.home();
}

test.describe("Prep the day before", () => {
  test("a dish that needs prep isn't tonight's pick", async ({ page }) => {
    await at(page, "2026-10-18T10:00");
    const k = await cholesKitchen(page);
    await k.home();
    expect(await k.pickedDish("Lunch")).not.toBe("Chole");
    expect(await k.pickedDish("Dinner")).not.toBe("Chole");
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(k.dishes().filter({ hasText: /^Chole/ })).toContainText(
      "Soak the chickpeas 8 hours before",
    );
  });

  test("the evening before", async ({ page }) => {
    await at(page, "2026-10-18T21:00");
    const k = await cholesKitchen(page);
    await planner(k, page);
    await expect(tomorrow(page)).toContainText("Chole");
    const tonight = page
      .getByRole("region", { name: "Prep" })
      .getByRole("listitem")
      .filter({ hasText: "Tonight: soak the chickpeas, for tomorrow's lunch" });
    await tonight.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("region", { name: "Prep" })).toContainText(
      /Soaking since 9(:00)?\s?pm/i,
    );
    await at(page, "2026-10-19T11:00");
    await reopen(page, k);
    await expect(page.getByRole("region", { name: "Prep" })).toContainText(
      /Soaking since 9(:00)?\s?pm/i,
    );
  });

  test("the morning after", async ({ page }) => {
    await at(page, "2026-10-18T21:00");
    const k = await cholesKitchen(page);
    await planner(k, page);
    await expect(tomorrow(page)).toContainText("Chole");

    // Soaked, and marked done: chole stays lunch's pick.
    await page
      .getByRole("region", { name: "Prep" })
      .getByRole("listitem")
      .filter({ hasText: "for tomorrow's lunch" })
      .getByRole("button", { name: "Done" })
      .click();
    await at(page, "2026-10-19T08:00");
    await reopen(page, k);
    expect(await k.pickedDish("Lunch")).toBe("Chole");
  });

  test("the morning after, nothing marked", async ({ page }) => {
    await at(page, "2026-10-18T21:00");
    const k = await cholesKitchen(page);
    await planner(k, page);
    await expect(tomorrow(page)).toContainText("Chole");
    await at(page, "2026-10-19T08:00");
    await reopen(page, k);
    expect(await k.pickedDish("Lunch")).toBe("Chole");
    const ask = page
      .getByRole("region", { name: "Prep" })
      .getByRole("listitem")
      .filter({ hasText: "Did you soak the chickpeas last night?" });
    await expect(ask.getByRole("button", { name: "Yes" })).toBeVisible();
    await ask.getByRole("button", { name: "No" }).click();
    await expect(k.pick("Lunch")).not.toContainText("Chole");
    // Chole moves to tomorrow: its soak is tonight's.
    await at(page, "2026-10-19T17:00");
    await reopen(page, k);
    await expect(page.getByRole("region", { name: "Prep" })).toContainText(
      "Tonight: soak the chickpeas, for tomorrow's lunch",
    );
  });

  test("tinned beans", async ({ page }) => {
    await at(page, "2026-10-18T10:00");
    const k = await cholesKitchen(page);
    await k.home();
    await k.settings();
    await page.getByRole("radio", { name: "Tinned beans" }).click();
    await k.home();
    expect(await k.pickedDish("Lunch")).toBe("Chole");
    await expect(k.pick("Lunch")).not.toContainText(/soak/i);
  });

  test("the dish page", async ({ page }) => {
    await at(page, "2026-10-18T10:00");
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Chole");
    const prep = page.getByRole("region", { name: "Prep" });
    await expect(prep).toContainText(
      "Soak the chickpeas overnight, at least 8 hours",
    );
    const top = async (name: string) =>
      (await page.getByRole("region", { name }).boundingBox())?.y ?? 0;
    expect(await top("Prep")).toBeLessThan(await top("You have"));
  });
});
