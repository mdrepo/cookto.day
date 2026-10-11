import { useId, type ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  /** What the card is: a dish, a pantry item. Screen readers read it as the card's name. */
  title: string;
  /** The title's heading level, under the screen's own headings. */
  level?: 2 | 3 | 4;
  children: ReactNode;
}

/** One thing, on the surface colour. */
export function Card({ title, level = 3, children }: CardProps) {
  const titleId = useId();
  const Heading = `h${level}` as const;
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <Heading id={titleId} className={styles.title}>
        {title}
      </Heading>
      {children}
    </article>
  );
}
