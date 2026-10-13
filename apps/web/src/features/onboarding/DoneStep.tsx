import { Note, Rows } from "@cookto/ui";
import { useDoneStep } from "./useDoneStep.js";

export function DoneStep() {
  const d = useDoneStep();
  return (
    <>
      <Rows label={d.label} rows={d.rows} />
      <Note>{d.note}</Note>
    </>
  );
}
