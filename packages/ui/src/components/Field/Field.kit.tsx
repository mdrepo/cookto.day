import { LANGUAGES, words, type Kit } from "../../kit.js";
import { Select } from "../Select/Select.js";
import { Field } from "./Field.js";

const options = LANGUAGES.map(([code, name]) => (
  <option key={code} value={code} lang={code}>
    {name}
  </option>
));

export const kit: Kit = {
  name: "Field",
  about: "A label and its control, with what's wrong under it.",
  examples: [
    {
      title: "Stacked",
      render: (lang) => (
        <Field label={words[lang].language}>
          {(control) => <Select {...control}>{options}</Select>}
        </Field>
      ),
    },
    {
      title: "Inline, as in a header",
      render: (lang) => (
        <Field label={words[lang].language} layout="inline">
          {(control) => <Select {...control}>{options}</Select>}
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
