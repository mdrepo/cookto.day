import { describe, expect, test } from "bun:test";
import { Field, Input } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md, criterion 3: a person's optional name. Inside a
// Field, so its label names it.

describe("Input", () => {
  test("is the browser's own text box, named by its Field's label", () => {
    const doc = render(
      <Field label="Name (optional)" id="name">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = doc.querySelector("input");
    expect(input?.getAttribute("type")).toBe("text");
    const label = doc.querySelector(`label[for="${input?.id ?? ""}"]`);
    expect(label?.textContent).toBe("Name (optional)");
  });

  test("keeps what it's given: a value, a placeholder, disabled", () => {
    const doc = render(
      <Input id="n" value="Kid" placeholder="Child" disabled readOnly />,
    );
    const input = doc.querySelector("input");
    expect(input?.getAttribute("value")).toBe("Kid");
    expect(input?.getAttribute("placeholder")).toBe("Child");
    expect(input?.disabled).toBe(true);
  });
});
