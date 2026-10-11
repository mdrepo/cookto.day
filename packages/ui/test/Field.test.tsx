import { describe, expect, test } from "bun:test";
import { Field } from "../src/index.js";
import { render, textOf } from "./render.js";

describe("Field", () => {
  test("its label names the control", () => {
    const doc = render(
      <Field label="Language">{(control) => <input {...control} />}</Field>,
    );
    const input = doc.querySelector("input");
    const label = doc.querySelector(`label[for="${input?.id ?? ""}"]`);
    expect(input?.id).toBeTruthy();
    expect(label?.textContent).toBe("Language");
  });

  test("keeps the id it's given", () => {
    const doc = render(
      <Field label="Language" id="language">
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(doc.querySelector("input")?.id).toBe("language");
  });

  test("a problem is read with the control, and marks it invalid", () => {
    const doc = render(
      <Field label="Language" problem="Choose a language">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = doc.querySelector("input");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(textOf(doc, input?.getAttribute("aria-describedby") ?? null)).toBe(
      "Choose a language",
    );
  });

  test("without a problem, nothing extra is read", () => {
    const doc = render(
      <Field label="Language">{(control) => <input {...control} />}</Field>,
    );
    const input = doc.querySelector("input");
    expect(input?.hasAttribute("aria-invalid")).toBe(false);
    expect(input?.hasAttribute("aria-describedby")).toBe(false);
  });
});
