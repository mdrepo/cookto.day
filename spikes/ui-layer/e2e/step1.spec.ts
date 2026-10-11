import { expect, test, type Page } from "@playwright/test";

// One spec, run against both versions (see playwright.config.ts). The tests
// target what a no-framework version usually gets wrong: focus, the caret,
// and live updates while typing.

const member = (page: Page, name: string) =>
  page.locator(".member").filter({
    has: page.locator(".who-name", { hasText: new RegExp(`^${name}$`) }),
  });
const nameInput = (page: Page) => page.getByLabel("Name or nickname");

test.beforeEach(async ({ page }) => {
  await page.goto("./");
});

test("typing a name updates the row as you type and keeps the caret", async ({
  page,
}) => {
  await member(page, "Dua").locator(".member-row").click();
  const input = nameInput(page);
  await input.click();
  await input.press("ControlOrMeta+a");
  await input.pressSequentially("Dua M", { delay: 20 });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Dua M");
  await expect(member(page, "Dua M")).toHaveCount(1);

  // Edit in the middle: the caret must stay where the person put it.
  await input.press("Home");
  await input.pressSequentially("Little ", { delay: 20 });
  await expect(input).toHaveValue("Little Dua M");
  await expect(input).toBeFocused();
  await expect(member(page, "Little Dua M").locator(".avatar")).toHaveText("L");
});

test("choosing Baby turns on the baby rules", async ({ page }) => {
  await member(page, "Dua").locator(".member-row").click();
  const baby = page.getByRole("button", { name: "Baby · under 1" });
  await baby.click();
  await expect(baby).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".rule")).toContainText("no salt, sugar or honey");
  await expect(member(page, "Dua").locator(".who-group")).toHaveText(
    "Baby · baby rules on",
  );
});

test("adding someone opens their card, ready to type a name", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Add someone" }).click();
  await expect(page.locator(".member")).toHaveCount(4);
  await expect(nameInput(page)).toBeFocused();
  await expect(nameInput(page)).toHaveValue("Someone");
});

test("Done closes the card and puts focus back on that person", async ({
  page,
}) => {
  const row = member(page, "Adult 2").locator(".member-row");
  await row.click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(nameInput(page)).toHaveCount(0);
  await expect(row).toBeFocused();
});

test("removing someone takes them off the list", async ({ page }) => {
  await member(page, "Adult 2").locator(".member-row").click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator(".member")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "+ Add someone" }),
  ).toBeFocused();
});

test("choosing Arabic lays the page out right to left", async ({ page }) => {
  const arabic = page.getByRole("button", { name: "العربية" });
  await arabic.click();
  await expect(arabic).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
