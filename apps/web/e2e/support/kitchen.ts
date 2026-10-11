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

  /** Presses Tab until the language list has focus, as a keyboard user would. */
  async tabToLanguageList(): Promise<void> {
    const list = this.page.getByRole("combobox");
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press("Tab");
      if (await list.evaluate((el) => el === document.activeElement)) return;
    }
    throw new Error("Tab never reached the language list");
  }

  /** The outline around whatever has focus, and the page's action colour. */
  focusOutline(): Promise<{
    width: number;
    style: string;
    offset: number;
    colour: string;
    actionColour: string;
  }> {
    return this.page.evaluate(() => {
      const el = document.activeElement;
      if (!el) throw new Error("nothing has focus");
      const s = getComputedStyle(el);
      const probe = document.createElement("span");
      probe.style.color = "var(--color-accent)";
      document.body.append(probe);
      const actionColour = getComputedStyle(probe).color;
      probe.remove();
      return {
        width: parseFloat(s.outlineWidth),
        style: s.outlineStyle,
        offset: parseFloat(s.outlineOffset),
        colour: s.outlineColor,
        actionColour,
      };
    });
  }

  /** Line height of the empty state's sentence, as a multiple of its text size. */
  lineHeight(): Promise<number> {
    return this.page.locator(".empty-body").evaluate((el) => {
      const s = getComputedStyle(el);
      return parseFloat(s.lineHeight) / parseFloat(s.fontSize);
    });
  }
}
