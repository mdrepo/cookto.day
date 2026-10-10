import type { Locator, Page } from "@playwright/test";

// Everything that knows about the page's markup lives here, so specs read in
// the user's words and a markup change is fixed in one place.

export class Kitchen {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/");
  }

  title(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  emptyState(): Locator {
    return this.page.locator(".empty-state");
  }

  async chooseLanguage(name: string): Promise<void> {
    await this.page.getByRole("combobox").selectOption({ label: name });
  }

  /** "ltr" or "rtl": the direction the whole page is laid out in. */
  direction(): Promise<string> {
    return this.page.evaluate(
      () => getComputedStyle(document.documentElement).direction,
    );
  }

  /** Which side of the screen the header's tagline starts from. */
  taglineStartsFrom(): Promise<"left" | "right"> {
    return this.page.locator(".site-tagline").evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getClientRects()[0];
      const box = el.getBoundingClientRect();
      if (!text) throw new Error("the tagline has no text");
      return text.left - box.left < box.right - text.right ? "left" : "right";
    });
  }
}
