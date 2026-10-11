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

  /** The empty state: the one region in the page's main part. */
  emptyState(): Locator {
    return this.page.getByRole("main").getByRole("region");
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
    return this.emptyState()
      .getByRole("paragraph")
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return parseFloat(s.lineHeight) / parseFloat(s.fontSize);
      });
  }

  /**
   * How the page looks, part by part: sizes, colours (as the design's
   * variable names) and where each part sits. For checking that a rebuild
   * changes nothing people can see.
   */
  look(): Promise<Record<string, string | number>> {
    return this.page.evaluate(() => {
      const colours = [
        "bg",
        "surface",
        "text",
        "text-muted",
        "border",
        "warn",
      ].map((name) => {
        const probe = document.createElement("span");
        probe.style.color = `var(--color-${name})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return [value, name] as const;
      });
      const colour = (value: string) => new Map(colours).get(value) ?? value;
      const find = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error(`no ${selector}`);
        return el;
      };
      const title = find("h1");
      const label = find("header label");
      const select = find("header select");
      const empty = find("main section");
      const emptyTitle = find("main section h2");
      const emptyBody = find("main section p");
      const note = find("main > p");
      const s = (el: Element) => getComputedStyle(el);
      const box = (el: Element) => el.getBoundingClientRect();
      return {
        titleSize: s(title).fontSize,
        titleWeight: s(title).fontWeight,
        labelSize: s(label).fontSize,
        labelColour: colour(s(label).color),
        labelBesideSelect:
          Math.abs(
            box(label).top +
              box(label).height / 2 -
              (box(select).top + box(select).height / 2),
          ) < 2
            ? "yes"
            : "no",
        selectHeight: Math.round(box(select).height),
        selectRadius: s(select).borderRadius,
        selectBorder: `${s(select).borderStyle} ${colour(s(select).borderColor)}`,
        selectBackground: colour(s(select).backgroundColor),
        emptyBorder: `${s(empty).borderStyle} ${colour(s(empty).borderColor)}`,
        emptyRadius: s(empty).borderRadius,
        emptyPadding: s(empty).padding,
        emptyBackground: colour(s(empty).backgroundColor),
        emptyAlign: s(empty).textAlign,
        emptyTitleSize: s(emptyTitle).fontSize,
        emptyTitleWeight: s(emptyTitle).fontWeight,
        emptyBodyColour: colour(s(emptyBody).color),
        emptyBodyGap: Math.round(box(emptyBody).top - box(emptyTitle).bottom),
        noteSize: s(note).fontSize,
        noteColour: colour(s(note).color),
        noteAlign: s(note).textAlign,
        noteGap: Math.round(box(note).top - box(empty).bottom),
      };
    });
  }
}
