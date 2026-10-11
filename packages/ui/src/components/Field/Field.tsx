import { useId, type ReactNode } from "react";
import styles from "./Field.module.css";

/** What a Field gives its control, so the label and any problem belong to it. */
export interface FieldControl {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export interface FieldProps {
  label: string;
  /** What's wrong, in plain words. Shown under the control and read with it. */
  problem?: string;
  /** "inline" puts the label beside a small control, as in a header. */
  layout?: "stacked" | "inline";
  /** The control's id, when something else needs to find it. */
  id?: string;
  children: (control: FieldControl) => ReactNode;
}

/** A label, its control, and what's wrong with it, if anything. */
export function Field({
  label,
  problem,
  layout = "stacked",
  id,
  children,
}: FieldProps) {
  const ownId = useId();
  const controlId = id ?? ownId;
  const problemId = `${controlId}-problem`;
  const control: FieldControl = problem
    ? { id: controlId, "aria-describedby": problemId, "aria-invalid": true }
    : { id: controlId };
  return (
    <div className={layout === "inline" ? styles.inline : styles.stacked}>
      <label className={styles.label} htmlFor={controlId}>
        {label}
      </label>
      {children(control)}
      {problem && (
        <p id={problemId} className={styles.problem}>
          {problem}
        </p>
      )}
    </div>
  );
}
