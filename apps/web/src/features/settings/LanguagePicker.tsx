import { Field, Select } from "@cookto/ui";
import { LOCALES } from "../../i18n/index.js";
import { useLanguagePicker } from "./useLanguagePicker.js";

/**
 * Every language the app has, each named in its own script. One that's
 * coming soon is listed, but can't be chosen.
 */
export function LanguagePicker() {
  const { locale, label, soon, choose } = useLanguagePicker();
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
          {Object.entries(LOCALES).map(([code, l]) => (
            <option key={code} value={code} lang={code} disabled={l.soon}>
              {l.soon ? `${l.name} (${soon})` : l.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
