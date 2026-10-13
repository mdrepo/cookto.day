import { type ReactNode, useId } from "react";
import styles from "./Callout.module.css";

export interface CalloutProps {
  title: string;
  /** One sentence under the title. */
  children?: ReactNode;
  /** Its buttons, side by side: the main one first. */
  actions?: ReactNode;
}

/** A warm card: a soft fill, a title, a sentence and its buttons (#84). */
export function Callout({ title, children, actions }: CalloutProps) {
  const titleId = useId();
  return (
    <section className={styles.callout} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {children && <p className={styles.body}>{children}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
