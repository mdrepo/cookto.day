import styles from "./Steps.module.css";

export interface StepsProps {
  /** This step, counting from 1. */
  current: number;
  total: number;
  /** This step in words, in the page's language: "Step 1 of 2". */
  label: string;
}

/** Where someone is in a few steps: in words, and a bar per step. */
export function Steps({ current, total, label }: StepsProps) {
  return (
    <div className={styles.steps}>
      <p className={styles.label}>{label}</p>
      <div aria-hidden="true" className={styles.bars}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-done={i < current} className={styles.bar} />
        ))}
      </div>
    </div>
  );
}
