import type { ReactNode } from "react";
import type { Space } from "../../tokens.js";
import { gapClass } from "../gap.js";
import styles from "./Screen.module.css";

export interface ScreenProps {
  /** The page's title, its only h1. */
  title: string;
  /** A small, muted line above the title: today's date, or where you are. */
  eyebrow?: string;
  tagline?: string;
  /** At the title's end: one small action, like settings or "Add food". */
  action?: ReactNode;
  /** Above the title: where someone is in a few steps, or a way back. */
  header?: ReactNode;
  /** At the bottom of the screen, however short the page: the TabBar. */
  bar?: ReactNode;
  /** The space between the main part's parts: a spacing step. */
  gap?: Space;
  children: ReactNode;
}

/** A whole page: its light header, then its main part, in one centred column. */
export function Screen({
  title,
  eyebrow,
  tagline,
  action,
  header,
  bar,
  gap = 4,
  children,
}: ScreenProps) {
  return (
    <div className={styles.screen}>
      <header className={`${styles.column} ${styles.header}`}>
        {header}
        <div className={styles.top}>
          <div className={styles.titles}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1 className={styles.title}>{title}</h1>
            {tagline && <p className={styles.tagline}>{tagline}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className={`${styles.column} ${styles.main} ${gapClass(gap)}`}>
        {children}
      </main>
      {bar}
    </div>
  );
}
