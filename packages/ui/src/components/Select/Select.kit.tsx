import { LANGUAGES, words, type Kit } from "../../kit.js";
import { Field } from "../Field/Field.js";
import { Select } from "./Select.js";

const options = LANGUAGES.map(([code, name]) => (
  <option key={code} value={code} lang={code}>
    {name}
  </option>
));

export const kit: Kit = {
  name: "Select",
  about: "A choice from a short list. Always inside a Field, for its label.",
  examples: [
    {
      title: "Normal",
      render: (lang) => (
        <Field label={words[lang].language}>
          {(control) => <Select {...control}>{options}</Select>}
        </Field>
      ),
    },
    {
      title: "Disabled",
      render: (lang) => (
        <Field label={words[lang].language}>
          {(control) => (
            <Select {...control} disabled>
              {options}
            </Select>
          )}
        </Field>
      ),
    },
    {
      title: "With a problem",
      render: (lang) => (
        <Field
          label={words[lang].language}
          problem={words[lang].chooseLanguage}
        >
          {(control) => <Select {...control}>{options}</Select>}
        </Field>
      ),
    },
  ],
};
