import styles from "./Reasons.module.css";

export interface Reason {
  key: string;
  text: string;
  /**
   * warm: uses food that needs using (the warning colour). good: good news,
   * like "Has everything" (aubergine). quiet: what's missing (muted).
   */
  tone: "warm" | "good" | "quiet";
}

/** Why something is suggested: a dot, then a few words, per reason. */
export function Reasons({ items }: { items: readonly Reason[] }) {
  return (
    <ul className={styles.reasons}>
      {items.map((r) => (
        <li key={r.key} className={`${styles.reason} ${styles[r.tone]}`}>
          <span className={styles.dot} aria-hidden="true" />
          {r.text}
        </li>
      ))}
    </ul>
  );
}
