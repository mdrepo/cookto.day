import { describe, expect, test } from "bun:test";
import { Select } from "../src/index.js";
import { render } from "./render.js";

describe("Select", () => {
  test("is the browser's own select, with its options", () => {
    const doc = render(
      <Select defaultValue="ar" onChange={() => undefined}>
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </Select>,
    );
    const select = doc.querySelector("select");
    expect(select).not.toBeNull();
    expect([...(select?.options ?? [])].map((o) => o.value)).toEqual([
      "en",
      "ar",
    ]);
    expect(select?.querySelector("[selected]")?.textContent).toBe("العربية");
  });

  test("can be disabled", () => {
    const doc = render(
      <Select disabled>
        <option>English</option>
      </Select>,
    );
    expect(doc.querySelector("select")?.disabled).toBe(true);
  });
});
