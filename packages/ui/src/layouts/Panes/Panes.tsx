import type { ReactNode } from "react";
import styles from "./Panes.module.css";

export interface PanesProps {
  /** The page's main pane: Cook today. */
  primary: ReactNode;
  /** The side pane: Use soon. On a phone it comes first, above the main one. */
  secondary: ReactNode;
}

/**
 * Two panes, like a tablet app's fragments: side by side on a wide screen,
 * one above the other on a phone.
 */
export function Panes({ primary, secondary }: PanesProps) {
  return (
    <div className={styles.panes}>
      <div className={styles.secondary}>{secondary}</div>
      <div className={styles.primary}>{primary}</div>
    </div>
  );
}
