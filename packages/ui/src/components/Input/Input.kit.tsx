import { words, type Kit } from "../../kit.js";
import { Field } from "../Field/Field.js";
import { Input } from "./Input.js";

export const kit: Kit = {
  name: "Input",
  about: "The browser's own text box, inside a Field, which names it.",
  examples: [
    {
      title: "Empty",
      render: (lang) => (
        <Field label={words[lang].nameOptional}>
          {(control) => <Input {...control} placeholder={words[lang].child} />}
        </Field>
      ),
    },
    {
      title: "Filled",
      render: (lang) => (
        <Field label={words[lang].nameOptional}>
          {(control) => (
            <Input {...control} defaultValue={words[lang].carrots} />
          )}
        </Field>
      ),
    },
    {
      title: "Disabled",
      render: (lang) => (
        <Field label={words[lang].nameOptional}>
          {(control) => <Input {...control} disabled />}
        </Field>
      ),
    },
  ],
};
