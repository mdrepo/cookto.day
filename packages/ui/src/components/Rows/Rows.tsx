import type { ReactNode } from "react";
import styles from "./Rows.module.css";

export interface Row {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** Nothing there ("Not planned"): the value is muted. */
  quiet?: boolean;
}

export interface RowsProps {
  /** What the rows are, for screen readers: "Meals". */
  label?: string;
  rows: readonly Row[];
}

/** A short list of labels with their values, like each meal and who eats it. */
export function Rows({ label, rows }: RowsProps) {
  return (
    <ul className={styles.rows} aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className={styles.row}>
          <strong className={styles.label}>{row.label}</strong>
          <span className={row.quiet ? styles.quiet : styles.value}>
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
