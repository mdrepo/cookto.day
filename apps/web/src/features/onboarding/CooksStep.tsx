import { Choice } from "@cookto/ui";
import { useId } from "react";
import { useCooksStep } from "./useCooksStep.js";

export function CooksStep() {
  const c = useCooksStep();
  return (
    <Choice
      legend={c.legend}
      hideLegend
      name={useId()}
      value={c.value}
      options={c.options}
      onChange={c.choose}
    />
  );
}
