import { Field, Select } from "@cookto/ui";
import { LOCALES } from "../../i18n/index.js";
import { useLanguagePicker } from "./useLanguagePicker.js";

/** Every language the app speaks, each named in its own script. */
export function LanguagePicker() {
  const { locale, label, choose } = useLanguagePicker();
  return (
    <Field label={label} layout="inline" id="language">
      {(control) => (
        <Select
          {...control}
          value={locale}
          onChange={(e) => {
            choose(e.currentTarget.value);
          }}
        >
          {Object.entries(LOCALES).map(([code, { name }]) => (
            <option key={code} value={code} lang={code}>
              {name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
