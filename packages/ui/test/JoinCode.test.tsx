import { describe, expect, test } from "bun:test";
import { JoinCode } from "../src/index.js";
import { render } from "./render.js";

// specs/216 and #217, the owner's design of 20 Oct 2026: a code to read out
// or type, large, and a QR code of the same link for a phone's camera. The
// matrix comes from the engine (@cookto/engine/qr); this only draws it.

/** A 21-module code with four dark modules, as a test matrix. */
const matrix = Array.from({ length: 21 }, (_, r) =>
  Array.from({ length: 21 }, (_, c) => r === 0 && c < 4),
);

describe("JoinCode", () => {
  test("the code is an output, named, read as its letters; no image without a matrix", () => {
    const doc = render(<JoinCode code="KM7Q-4HTX" label="Account" />);
    const out = doc.querySelector("output");
    expect(out?.getAttribute("aria-label")).toBe("Account");
    expect(out?.textContent).toBe("KM7Q-4HTX");
    expect(doc.querySelector("svg")).toBeNull();
  });

  test("with a matrix, a QR image: one square per dark module, and a quiet zone", () => {
    const doc = render(
      <JoinCode
        code="KM7Q-4HTX"
        label="Account"
        qr={matrix}
        qrLabel="QR code of the link"
      />,
    );
    const svg = doc.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("QR code of the link");
    // Four modules of quiet zone on every side: 21 + 8.
    expect(svg?.getAttribute("viewBox")).toBe("0 0 29 29");
    expect(doc.querySelectorAll("svg rect").length).toBe(4);
    const first = doc.querySelector("svg rect");
    expect(first?.getAttribute("x")).toBe("4");
    expect(first?.getAttribute("y")).toBe("4");
  });
});
