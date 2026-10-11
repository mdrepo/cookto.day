import { useId, type ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  /** One sentence that says what to do next. */
  children: ReactNode;
}

/** Nothing to show yet, and how to start. */
export function EmptyState({ title, children }: EmptyStateProps) {
  const titleId = useId();
  return (
    <section className={styles.root} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p className={styles.body}>{children}</p>
    </section>
  );
}
