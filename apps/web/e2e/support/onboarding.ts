import type { Locator, Page } from "@playwright/test";

// The onboarding steps, in the user's words: what they see and press. Only
// this file knows the markup (see kitchen.ts).

export class Onboarding {
  constructor(private readonly page: Page) {}

  /** A first visit: nothing saved. */
  async open(): Promise<void> {
    await this.page.goto("/");
  }

  title(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  step(): Locator {
    return this.page.getByText(/^Step \d of \d$/);
  }

  country(name: string): Locator {
    return this.page.getByRole("radio", { name: new RegExp(name) });
  }

  /** The card a country's radio sits in, with its currency and shops. */
  countryCard(name: string): Locator {
    return this.page.locator("label").filter({
      has: this.page.getByRole("radio", { name: new RegExp(name) }),
    });
  }

  button(name: string): Locator {
    return this.page.getByRole("button", { name, exact: true });
  }

  async next(): Promise<void> {
    await this.button("Next").click();
  }

  /** Adds an adult, a child or a toddler. */
  async add(kind: "Adult" | "Child" | "Toddler"): Promise<void> {
    await this.button(kind).click();
  }

  person(name: string): Locator {
    return this.page.getByRole("article", { name, exact: true });
  }

  people(): Locator {
    return this.page.getByRole("article");
  }

  meal(person: string, meal: string): Locator {
    return this.person(person).getByRole("button", { name: meal, exact: true });
  }

  async remove(person: string): Promise<void> {
    await this.person(person)
      .getByRole("button", { name: `Remove ${person}` })
      .click();
  }

  async name(person: string, name: string): Promise<void> {
    await this.person(person)
      .getByRole("textbox", { name: "Name (optional)" })
      .fill(name);
  }

  /** "All set": who a meal is planned for, as the row for that meal says. */
  plannedFor(meal: string): Locator {
    return this.page.getByRole("listitem").filter({ hasText: meal });
  }

  /** Home's line about the household: "2 people · 5 meals a day". */
  household(): Locator {
    return this.page.getByText(/ a day$/);
  }

  emptyKitchen(): Locator {
    return this.page.getByRole("main").getByRole("region");
  }
}
