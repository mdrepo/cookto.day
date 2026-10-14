import { describe, expect, test } from "bun:test";
import { LinkOut } from "../src/index.js";
import { render } from "./render.js";

// A link to another site, like a dish's recipe (#95): it says where it goes,
// and opens in a new tab, so the app stays where it was.
describe("LinkOut", () => {
  test("is a link that names the site, and opens in a new tab", () => {
    const doc = render(
      <LinkOut href="https://www.vegrecipesofindia.com/palak-paneer/">
        See the recipe
      </LinkOut>,
    );
    const link = doc.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "https://www.vegrecipesofindia.com/palak-paneer/",
    );
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.textContent).toContain("See the recipe");
    // The site, without "www.": where the link goes, before you press it.
    expect(link?.textContent).toContain("vegrecipesofindia.com");
    expect(link?.textContent).not.toContain("www.");
  });
});
