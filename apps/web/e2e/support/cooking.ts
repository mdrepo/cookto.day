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
    await this.button("Next").click();
    // Under load on an iPhone, the tap on the last step can land before the
    // step is ready, and the deploy failed on it: tap until Today shows.
    await expect(async () => {
      const go = this.button("Go to my kitchen");
      if (await go.isVisible()) await go.click();
      await expect(this.title()).toHaveText("cookto.day", { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
  }

  /** Settings, from More (specs/175). */
  async settings(): Promise<void> {
    await this.tabs()
      .getByRole("button", { name: "More", exact: true })
      .click();
    await this.press("Settings");
    await expect(this.title()).toHaveText("Settings");
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
    await this.tryAdd(name, amount, daysAgo);
    await expect(this.item(name)).toBeVisible();
  }

  /** Fills in "Add food" and presses Add, whether or not it saves. */
  async tryAdd(
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
  }

  /** "Add food" is still open with what they typed: press Add again. */
  async addAgain(): Promise<void> {
    await this.page
      .getByRole("form", { name: "Add food" })
      .getByRole("button", { name: "Add" })
      .click();
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
    return this.dishOf(this.pick(meal));
  }

  /** The dish a pick names, in large words, wherever the pick is. */
  async dishOf(pick: Locator): Promise<string> {
    return (await pick.locator(":scope > :nth-child(2)").textContent()) ?? "";
  }

  /** A row's name in a list of ideas or dishes, without its line. */
  async nameOf(row: Locator): Promise<string> {
    return (await row.locator("strong").textContent()) ?? "";
  }

  /** In a list of labels and values (each meal, its dish): one label's value. */
  async valueOf(list: Locator, label: string): Promise<string> {
    return (
      (await list
        .getByRole("listitem")
        .filter({ hasText: label })
        .locator("span")
        .textContent()) ?? ""
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

  /** On My dishes: takes a dish out of them (specs/175). */
  async takeOut(name: string): Promise<void> {
    await this.dishes()
      .filter({
        has: this.page.getByRole("button", { name: new RegExp(`^${name}`) }),
      })
      .getByRole("button", { name: `Take out ${name}` })
      .click();
  }

  /** Every dish in My dishes: ready ones first, then the rest (#97). */
  dishes(): Locator {
    return this.page
      .getByRole("list", { name: /^(You can cook now|Need a few things)$/ })
      .getByRole("listitem");
  }

  /** One of Dishes' two lists' rows, in order (#97). */
  dishGroup(name: "You can cook now" | "Need a few things"): Locator {
    return this.page.getByRole("list", { name }).getByRole("listitem");
  }

  /** From anywhere after setup: opens a dish's page from Dishes (#95). */
  async openDish(name: string): Promise<void> {
    await this.tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(this.title()).toHaveText("My dishes");
    await this.dishes()
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .click();
    await expect(this.title()).toHaveText(name);
  }

  /** On a dish's page: one of its lists, "You have" or "You need". */
  dishList(name: "You have" | "You need"): Locator {
    return this.page.getByRole("region", { name });
  }

  /** On a dish's page: a food's row, with its amount, in either list. */
  ingredient(food: string): Locator {
    return this.page
      .getByRole("region", { name: /^You (have|need)$/ })
      .getByRole("listitem")
      .filter({ hasText: food });
  }
}
