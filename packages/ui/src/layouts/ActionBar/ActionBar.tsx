import type { ReactNode } from "react";
import styles from "./ActionBar.module.css";

export interface ActionBarProps {
  /** The actions, side by side: the last one, the main action, takes the room. */
  children: ReactNode;
  /** Anything under them, centred: a way out, like "Skip for now". */
  below?: ReactNode;
}

/** The actions at the bottom of a step, within the thumb's reach. */
export function ActionBar({ children, below }: ActionBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.actions}>{children}</div>
      {below && <div className={styles.below}>{below}</div>}
    </div>
  );
}
