import { Choice } from "@cookto/ui";
import { useRolePicker } from "./useRolePicker.js";

/** Who cooks (specs/195): two cards, each one tap. */
export function RolePicker() {
  const { role, label, options, choose } = useRolePicker();
  return (
    <Choice
      legend={label}
      name="role"
      value={role}
      options={options}
      onChange={choose}
    />
  );
}
