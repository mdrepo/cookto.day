import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import styles from "./UndoBar.module.css";

/**
 * What a one-tap change did, with a way back (#116): "Onion used up · Undo".
 * Or, as a `problem`, what went wrong, with "OK" (#138). Screen readers hear
 * it, a problem at once. It stays until the screen moves on, never on a
 * timer: people need time to read it.
 */
export function UndoBar({
  children,
  undoLabel,
  onUndo,
  problem = false,
}: {
  /** What happened, in a few words. */
  children: ReactNode;
  undoLabel: string;
  onUndo: () => void;
  /** Something went wrong: the warning colour, and heard at once. */
  problem?: boolean;
}) {
  return (
    <div
      role={problem ? "alert" : "status"}
      className={problem ? `${styles.bar} ${styles.problem}` : styles.bar}
    >
      <span className={styles.text}>{children}</span>
      <Button kind="plain" onClick={onUndo}>
        {undoLabel}
      </Button>
    </div>
  );
}
