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
  /**
   * The TabBar: at the bottom of the screen, however short the page; on a
   * wide screen, a rail down the side.
   */
  bar?: ReactNode;
  /**
   * A short note that stays in view, like an UndoBar: just above the bar on
   * a phone, at the bottom of the column on a wide screen.
   */
  note?: ReactNode;
  /** The space between the main part's parts: a spacing step. */
  gap?: Space;
  children: ReactNode;
}

/**
 * A whole page: its light header, then its main part, in one centred
 * column. On a wide screen (840px, as Android's), its bar is a rail at the
 * side and the column is wider, with room for Panes. Every page has the same
 * width and edge: pages can't change it.
 */
export function Screen({
  title,
  eyebrow,
  tagline,
  action,
  header,
  bar,
  note,
  gap = 4,
  children,
}: ScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.frame}>
        <div className={styles.content}>
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
        </div>
        <div className={styles.dock}>
          {note && (
            <div className={`${styles.column} ${styles.note}`}>{note}</div>
          )}
          {bar && <div className={styles.bar}>{bar}</div>}
        </div>
      </div>
    </div>
  );
}
