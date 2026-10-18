import { Choice } from "@cookto/ui";
import { useBeansPicker } from "./useBeansPicker.js";

/** Dried or tinned beans (specs/144): two cards, each one tap. */
export function BeansPicker() {
  const { beans, label, options, choose } = useBeansPicker();
  return (
    <Choice
      legend={label}
      name="beans"
      value={beans}
      options={options}
      onChange={choose}
    />
  );
}
