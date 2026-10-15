import { describe, expect, test } from "bun:test";
import { Photo } from "../src/index.js";
import { render } from "./render.js";

// specs/118-dish-photos.md: a dish's photo loads only when it's near the
// screen, keeps its space so nothing jumps, and a dish without one gets a
// plain tile.

describe("Photo", () => {
  test("loads when near the screen, with its size known before it arrives", () => {
    const doc = render(
      <Photo src="palak.webp" alt="Palak paneer" shape="wide" />,
    );
    const img = doc.querySelector("img");
    expect(img?.getAttribute("src")).toBe("palak.webp");
    expect(img?.getAttribute("alt")).toBe("Palak paneer");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("decoding")).toBe("async");
    expect(img?.getAttribute("width")).toBe("800");
    expect(img?.getAttribute("height")).toBe("600");
  });

  test("a square one, and one the screen needs at once", () => {
    const doc = render(<Photo src="p.webp" alt="" shape="square" eager />);
    const img = doc.querySelector("img");
    expect(img?.getAttribute("width")).toBe("160");
    expect(img?.getAttribute("height")).toBe("160");
    expect(img?.getAttribute("loading")).toBe("eager");
  });

  test("without a photo: a plain tile with the pot, hidden from screen readers", () => {
    const doc = render(<Photo alt="Palak paneer" shape="square" />);
    expect(doc.querySelector("img")).toBeNull();
    const tile = doc.body.firstElementChild;
    expect(tile?.getAttribute("aria-hidden")).toBe("true");
    expect(tile?.querySelector("svg")).not.toBeNull();
  });
});
