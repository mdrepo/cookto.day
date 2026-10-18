import type { ReactNode } from "react";
import styles from "./ItemList.module.css";

export interface Item {
  key: string;
  name: string;
  /** Under the name: "250 g · use within 3 days". */
  line?: string;
  /** At the end: a Tag, or an amount. */
  end?: ReactNode;
  /** At the start: a small picture, like a dish's photo (specs/118). */
  media?: ReactNode;
  onOpen: () => void;
  /**
   * A button of its own at the row's end, beside the row's: "Take out"
   * (specs/175). `name` says which item: "Take out Poha".
   */
  action?: { label: string; name: string; run: () => void };
}

/** A short list where each row opens its item (the prototype's Fridge). */
export function ItemList({
  label,
  items,
}: {
  /** Names the list for screen readers. */
  label: string;
  items: readonly Item[];
}) {
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className={item.action && styles.withAction}>
          <button
            type="button"
            className={styles.row}
            onClick={(e) => {
              // Safari doesn't focus a button you click: focus it, so what
              // it opens can give focus back.
              e.currentTarget.focus();
              item.onOpen();
            }}
          >
            {item.media && <span className={styles.media}>{item.media}</span>}
            <span className={styles.text}>
              <strong className={styles.name}>{item.name}</strong>
              {item.line && <span className={styles.line}>{item.line}</span>}
            </span>
            {item.end}
          </button>
          {item.action && (
            // Its name starts with the words on it (WCAG 2.5.3).
            <button
              type="button"
              className={styles.action}
              aria-label={item.action.name}
              onClick={item.action.run}
            >
              {item.action.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
