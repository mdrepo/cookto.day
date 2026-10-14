import { Field, Select } from "@cookto/ui";
import { useThemePicker } from "./useThemePicker.js";

/** Light, dark, or the phone's theme (specs/96). */
export function ThemePicker() {
  const { theme, label, options, choose } = useThemePicker();
  return (
    <Field label={label} layout="inline" id="theme">
      {(control) => (
        <Select
          {...control}
          value={theme}
          onChange={(e) => {
            choose(e.currentTarget.value);
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
