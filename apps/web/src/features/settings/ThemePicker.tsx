import { Choice } from "@cookto/ui";
import { useThemePicker } from "./useThemePicker.js";

/**
 * Light, dark, or the phone's theme (specs/96): three cards, each one tap,
 * all in sight.
 */
export function ThemePicker() {
  const { theme, label, options, choose } = useThemePicker();
  return (
    <Choice
      legend={label}
      name="theme"
      value={theme}
      options={options.map((o) => ({ value: o.value, title: o.label }))}
      onChange={choose}
    />
  );
}
