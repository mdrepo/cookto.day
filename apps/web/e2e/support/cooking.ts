import { expect, type Locator, type Page } from "@playwright/test";

// The kitchen in the user's words: cuisines, staples, the pantry, dishes and
// what to cook today (specs/72-kitchen.md). Only this file knows the markup.

export class Cooking {
  constructor(private readonly page: Page) {}

  /** A household that finished onboarding: one adult, lunch and dinner. */
  async start(path = "/"): Promise<void> {
    await this.page.goto(path);
    await this.button("Next").click();
    await this.button("Next").click();
    await this.button("Go to my kitchen").click();
    await expect(this.title()).toHaveText("cookto.day");
  }

  title(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  button(name: string): Locator {
    return this.page.getByRole("button", { name, exact: true });
  }

  async press(name: string): Promise<void> {
    await this.button(name).click();
  }

  card(name: string): Locator {
    return this.page.getByRole("article", { name, exact: true });
  }

  /** Loads a cuisine from "Choose what you cook". */
  async load(cuisine: string): Promise<void> {
    await this.card(cuisine).getByRole("button", { name: "Load" }).click();
    await expect(this.card(cuisine)).toContainText("Loaded");
  }

  chip(name: string): Locator {
    return this.page.getByRole("button", { name, exact: true });
  }

  /** From home: load North Indian and add its staples, minus `untick`. */
  async loadNorthIndianWithStaples(untick: string[] = []): Promise<void> {
    await this.press("Choose what you cook");
    await this.load("North Indian");
    await this.press("Add the usual staples");
    for (const name of untick) await this.chip(name).click();
    await this.page.getByRole("button", { name: /^Add \d+ staples$/ }).click();
    await expect(this.title()).toHaveText("Fridge");
  }

  /** From the pantry: adds food, bought `daysAgo` days ago (0 is today). */
  async add(
    name: string,
    amount?: { value: string; unit: string },
    daysAgo = 0,
  ): Promise<void> {
    await this.press("Add food");
    const form = this.page.getByRole("form", { name: "Add food" });
    await form.getByRole("textbox", { name: "Name" }).fill(name);
    if (amount) {
      await form.getByRole("textbox", { name: "Amount" }).fill(amount.value);
      await form.getByRole("combobox", { name: "Unit" }).selectOption({
        label: amount.unit,
      });
    }
    await form
      .getByRole("combobox", { name: "Bought" })
      .selectOption({ index: daysAgo });
    await form.getByRole("button", { name: "Add" }).click();
    await expect(this.item(name)).toBeVisible();
  }

  /** The pantry's fresh food, what needs using first: "Use soon", then "Fresh". */
  fresh(): Locator {
    return this.page
      .getByRole("list", { name: /^(Use soon|Fresh)$/ })
      .getByRole("button");
  }

  /** A pantry row: one button, read with its line and its tag. */
  item(name: string): Locator {
    return this.page
      .getByRole("list", { name: /^(Use soon|Fresh|Staples)$/ })
      .getByRole("button", { name: new RegExp(`^${name}`) });
  }

  staples(): Locator {
    return this.page
      .getByRole("list", { name: "Staples" })
      .getByRole("listitem");
  }

  /** The sheet a row opens. */
  sheet(name: string): Locator {
    return this.page.getByRole("dialog", { name });
  }

  async open(name: string): Promise<void> {
    await this.item(name).click();
    await expect(this.sheet(name)).toBeVisible();
  }

  async mark(name: string, condition: string): Promise<void> {
    await this.open(name);
    await this.sheet(name)
      .getByRole("combobox", { name: "How it is" })
      .selectOption({ label: condition });
    await expect(this.sheet(name)).toBeHidden();
  }

  async changeAmount(name: string, value: string): Promise<void> {
    await this.open(name);
    const sheet = this.sheet(name);
    await sheet.getByRole("button", { name: "Change amount" }).click();
    await sheet.getByRole("textbox", { name: "Amount" }).fill(value);
    await sheet.getByRole("button", { name: "Save" }).click();
    await expect(sheet).toBeHidden();
  }

  async usedUp(name: string): Promise<void> {
    await this.open(name);
    await this.sheet(name).getByRole("button", { name: "Used up" }).click();
  }

  /** The bar at the bottom. */
  tabs(): Locator {
    return this.page.getByRole("navigation", { name: "Pages" });
  }

  async home(): Promise<void> {
    const back = this.button("Back");
    if (await back.isVisible()) await back.click();
    else await this.tabs().getByRole("button", { name: "Today" }).click();
    await expect(this.title()).toHaveText("cookto.day");
  }

  /** One meal's pick on Today. */
  pick(meal: string): Locator {
    return this.page
      .getByRole("region", { name: "Cook today" })
      .getByRole("article", { name: meal });
  }

  /** The dish one meal's pick names, in large words. */
  async pickedDish(meal: string): Promise<string> {
    return (
      (await this.pick(meal).locator(":scope > :nth-child(2)").textContent()) ??
      ""
    );
  }

  /**
   * One meal's ideas, best first: the pick (its dish, what it's served with
   * and why), then each of "Other ideas".
   */
  async ideas(meal: string): Promise<string[]> {
    const pick = this.pick(meal);
    const more = pick.getByRole("list", { name: "Other ideas" });
    if (!(await more.isVisible()))
      await pick.getByRole("button", { name: "Other ideas" }).click();
    const top = await pick.locator(":scope > p, :scope > ul").allTextContents();
    return [
      top.join(" "),
      ...(await more.getByRole("listitem").allTextContents()),
    ];
  }

  /** Today's "Use soon": what needs using. */
  useSoon(): Locator {
    return this.page
      .getByRole("list", { name: "Use soon" })
      .getByRole("button");
  }

  dishes(): Locator {
    return this.page
      .getByRole("list", { name: "Dishes" })
      .getByRole("listitem");
  }
}
