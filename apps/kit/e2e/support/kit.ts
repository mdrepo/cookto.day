import type { Locator, Page } from "@playwright/test";

// Everything that knows about the kit page's markup lives here, so specs read
// in the reviewer's words and a markup change is fixed in one place.

/** The four ways every part is shown, in order. */
export const PANELS = [
  "Light, English",
  "Dark, English",
  "Light, Arabic",
  "Dark, Arabic",
] as const;

export class Kit {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/kit/");
  }

  /** A part's section, found by its name. */
  part(name: string): Locator {
    return this.page.getByRole("region", { name, exact: true });
  }

  /** One of a part's four panels, by its name ("Dark, Arabic"). */
  panel(part: string, name: string): Locator {
    return this.part(part).getByRole("group", { name, exact: true });
  }

  panelNames(part: string): Promise<string[]> {
    return this.part(part)
      .getByRole("group")
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute("aria-label") ?? ""),
      );
  }

  /** One example in a panel, by its caption ("Disabled"). */
  example(panel: Locator, caption: string): Locator {
    return panel.getByRole("figure", { name: caption, exact: true });
  }

  /** How light a panel's background is: 0 is black, 1 is white. */
  lightness(panel: Locator): Promise<number> {
    return panel.evaluate((el) => {
      const [r = 0, g = 0, b = 0] = (
        getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []
      ).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
  }

  direction(locator: Locator): Promise<string> {
    return locator.evaluate((el) => getComputedStyle(el).direction);
  }

  /** The colour of a text, and the page's warning colour where it sits. */
  colours(text: Locator): Promise<{ colour: string; warn: string }> {
    return text.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--color-warn)";
      el.append(probe);
      const warn = getComputedStyle(probe).color;
      probe.remove();
      return { colour: getComputedStyle(el).color, warn };
    });
  }
}
