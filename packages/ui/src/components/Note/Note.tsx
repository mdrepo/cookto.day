import type { ReactNode } from "react";
import styles from "./Note.module.css";

export interface NoteProps {
  children: ReactNode;
}

/** A quiet note, for reassurance ("Nothing is uploaded"), never for errors. */
export function Note({ children }: NoteProps) {
  return <p className={styles.note}>{children}</p>;
}
