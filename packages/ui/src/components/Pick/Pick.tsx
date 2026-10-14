import { type ReactNode, useId } from "react";
import styles from "./Pick.module.css";

export interface PickProps {
  /** The meal it's for ("Lunch"): the card's heading. */
  label: string;
  /** The dish, in large words. */
  dish: string;
  /** What it's served with ("with Roti or Rice"), under the dish. */
  note?: string;
  /** Why it's picked (Reasons), and anything else, like "Other ideas". */
  children?: ReactNode;
  /** Opens the dish's page (#95): the dish becomes a button. */
  onOpen?: () => void;
}

/** The best dish for one meal, in large words, and why (the prototype's "Tonight"). */
export function Pick({ label, dish, note, children, onOpen }: PickProps) {
  const labelId = useId();
  return (
    <article className={styles.pick} aria-labelledby={labelId}>
      <h3 id={labelId} className={styles.label}>
        {label}
      </h3>
      <p className={styles.dish}>
        {onOpen ? (
          <button type="button" className={styles.open} onClick={onOpen}>
            {dish}
          </button>
        ) : (
          dish
        )}
      </p>
      {note && <p className={styles.note}>{note}</p>}
      {children}
    </article>
  );
}
