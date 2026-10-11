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

  /** Whether an icon is drawn turned round, left to right. */
  mirrored(icon: Locator): Promise<boolean> {
    return icon.evaluate((el) => {
      const t = getComputedStyle(el).transform;
      return t !== "none" && new DOMMatrix(t).a < 0;
    });
  }

  /** The colour an icon's lines are drawn in, and its text's colour. */
  strokeAndText(icon: Locator): Promise<{ stroke: string; text: string }> {
    return icon.evaluate((el) => ({
      stroke: getComputedStyle(el).stroke,
      text: getComputedStyle(el.parentElement ?? el).color,
    }));
  }

  /** How a part is drawn: its colours, border, corners and size. */
  drawn(part: Locator): Promise<Record<string, string | number>> {
    return part.evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        background: s.backgroundColor,
        colour: s.color,
        borderStyle: s.borderTopStyle,
        borderColour: s.borderTopColor,
        radius: s.borderTopLeftRadius,
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    });
  }

  /** A colour token ("accent", "on-accent") as it is where the part sits. */
  token(part: Locator, name: string): Promise<string> {
    return part.evaluate((el, token) => {
      const probe = document.createElement("span");
      probe.style.color = `var(--color-${token})`;
      (el.parentElement ?? el).append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    }, name);
  }

  /** Whether `el` can take keyboard focus. */
  focusable(el: Locator): Promise<boolean> {
    return el.evaluate((node) => {
      (node as HTMLElement).focus();
      return document.activeElement === node;
    });
  }

  /** Whether the first part is drawn to the left of the second. */
  leftOf(first: Locator, second: Locator): Promise<boolean> {
    return Promise.all([first.boundingBox(), second.boundingBox()]).then(
      ([a, b]) => (a?.x ?? 0) < (b?.x ?? 0),
    );
  }

  /** How many times a part's animation runs: "infinite", or a count. */
  animationRuns(el: Locator): Promise<string> {
    return el.evaluate(
      (node) => getComputedStyle(node).animationIterationCount,
    );
  }
}
