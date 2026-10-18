import styles from "./Method.module.css";

export interface MethodProps {
  /** Names the list for screen readers: "Steps". */
  label: string;
  /** Short steps, one action each, in order (specs/149). */
  steps: readonly string[];
}

/** How to cook a dish: its steps, numbered, each in a round mark. */
export function Method({ label, steps }: MethodProps) {
  if (steps.length === 0) return null;
  return (
    <ol className={styles.list} aria-label={label}>
      {steps.map((step, i) => (
        <li key={i} className={styles.step}>
          <span className={styles.mark} aria-hidden="true">
            {(i + 1).toLocaleString()}
          </span>
          <span className={styles.text}>{step}</span>
        </li>
      ))}
    </ol>
  );
}
