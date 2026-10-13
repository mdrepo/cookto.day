import type { ReactNode } from "react";
import styles from "./Tag.module.css";

export interface TagProps {
  /**
   * soft: a note about something ("toddler food"). outline: not here yet
   * ("Coming soon"). warn: food that needs using ("Past its best").
   */
  tone?: "soft" | "outline" | "warn";
  children: ReactNode;
}

/** A small label beside what it describes, read with it. */
export function Tag({ tone = "soft", children }: TagProps) {
  return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>;
}
