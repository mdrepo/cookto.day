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
    await expect(this.title()).toHaveText("Pantry");
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

  /** The pantry's fresh food, top first. */
  fresh(): Locator {
    return this.page
      .getByRole("region", { name: "Fresh" })
      .getByRole("article");
  }

  item(name: string): Locator {
    return this.card(name);
  }

  staples(): Locator {
    return this.page
      .getByRole("list", { name: "Staples" })
      .getByRole("listitem");
  }

  async mark(name: string, condition: string): Promise<void> {
    await this.item(name)
      .getByRole("combobox", { name: "How it is" })
      .selectOption({ label: condition });
  }

  async changeAmount(name: string, value: string): Promise<void> {
    await this.item(name)
      .getByRole("button", { name: "Change amount" })
      .click();
    await this.item(name).getByRole("textbox", { name: "Amount" }).fill(value);
    await this.item(name).getByRole("button", { name: "Save" }).click();
  }

  async usedUp(name: string): Promise<void> {
    await this.item(name).getByRole("button", { name: "Used up" }).click();
  }

  async home(): Promise<void> {
    await this.press("Back");
    await expect(this.title()).toHaveText("cookto.day");
  }

  /** Cook today's suggestions for one meal, best first. */
  suggestions(meal: string): Locator {
    return this.page
      .getByRole("region", { name: "Cook today" })
      .getByRole("article", { name: meal })
      .getByRole("listitem");
  }

  dishes(): Locator {
    return this.page
      .getByRole("list", { name: "Dishes" })
      .getByRole("listitem");
  }
}
