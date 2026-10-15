import { useId, type ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  /** What the card is: a dish, a pantry item. Screen readers read it as the card's name. */
  title: string;
  /** The title's heading level, under the screen's own headings. */
  level?: 2 | 3 | 4;
  /** A small action beside the title, at its end: remove, edit. */
  action?: ReactNode;
  /**
   * Folded to one line (#114): its title and a short summary, as a button
   * that opens it. Its contents aren't drawn while folded.
   */
  folded?: { summary: string; onOpen: () => void };
  children: ReactNode;
}

/** One thing, on the surface colour. */
export function Card({
  title,
  level = 3,
  action,
  folded,
  children,
}: CardProps) {
  const titleId = useId();
  const Heading = `h${level}` as const;
  if (folded)
    return (
      <article
        className={`${styles.card} ${styles.folded}`}
        aria-labelledby={titleId}
      >
        <div className={styles.head}>
          <Heading className={styles.title}>
            <button
              type="button"
              className={styles.fold}
              aria-expanded={false}
              onClick={folded.onOpen}
            >
              <span id={titleId}>{title}</span>
              {folded.summary && (
                <span className={styles.summary}>· {folded.summary}</span>
              )}
            </button>
          </Heading>
          {action}
        </div>
      </article>
    );
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      {action ? (
        <div className={styles.head}>
          <Heading id={titleId} className={styles.title}>
            {title}
          </Heading>
          {action}
        </div>
      ) : (
        <Heading id={titleId} className={styles.title}>
          {title}
        </Heading>
      )}
      {children}
    </article>
  );
}
