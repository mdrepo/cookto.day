import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import styles from "./UndoBar.module.css";

/**
 * What a one-tap change did, with a way back (#116): "Onion used up · Undo".
 * Screen readers hear it. It stays until the screen moves on, never on a
 * timer: people need time to read it.
 */
export function UndoBar({
  children,
  undoLabel,
  onUndo,
}: {
  /** What happened, in a few words. */
  children: ReactNode;
  undoLabel: string;
  onUndo: () => void;
}) {
  return (
    <div role="status" className={styles.bar}>
      <span className={styles.text}>{children}</span>
      <Button kind="plain" onClick={onUndo}>
        {undoLabel}
      </Button>
    </div>
  );
}
