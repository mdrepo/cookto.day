import { UndoBar } from "@cookto/ui";
import { useSaveProblem } from "./useSaveProblem.js";

/**
 * "Couldn't save that", on whichever screen is open (specs/138). Only this
 * part reads the problem, so a failed save redraws nothing else.
 */
export function SaveProblem() {
  const p = useSaveProblem();
  if (!p) return null;
  return (
    <UndoBar problem undoLabel={p.ok} onUndo={p.clear}>
      {p.text}
    </UndoBar>
  );
}
