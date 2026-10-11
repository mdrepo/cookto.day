import type { ReactNode } from "react";
import type { Space } from "../../tokens.js";
import { gapClass } from "../gap.js";
import styles from "./Screen.module.css";

export interface ScreenProps {
  /** The page's title, its only h1. */
  title: string;
  tagline?: string;
  /** What else sits in the header, like the language switch. */
  header?: ReactNode;
  /** The space between the main part's parts: a spacing step. */
  gap?: Space;
  children: ReactNode;
}

/** A whole page: its header, then its main part, in one centred column. */
export function Screen({
  title,
  tagline,
  header,
  gap = 4,
  children,
}: ScreenProps) {
  return (
    <div className={styles.screen}>
      <header className={`${styles.column} ${styles.header}`}>
        <h1 className={styles.title}>{title}</h1>
        {tagline && <p className={styles.tagline}>{tagline}</p>}
        {header}
      </header>
      <main className={`${styles.column} ${styles.main} ${gapClass(gap)}`}>
        {children}
      </main>
    </div>
  );
}
