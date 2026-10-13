import { Choice } from "@cookto/ui";
import { useId } from "react";
import { useWhereStep } from "./useWhereStep.js";

export function WhereStep() {
  const w = useWhereStep();
  return (
    <Choice
      legend={w.legend}
      hideLegend
      name={useId()}
      value={w.value}
      options={w.options}
      onChange={w.choose}
    />
  );
}
