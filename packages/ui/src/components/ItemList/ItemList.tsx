import type { ReactNode } from "react";
import styles from "./ItemList.module.css";

export interface Item {
  key: string;
  name: string;
  /** Under the name: "250 g · use within 3 days". */
  line?: string;
  /** At the end: a Tag, or an amount. */
  end?: ReactNode;
  onOpen: () => void;
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
        <li key={item.key}>
          <button type="button" className={styles.row} onClick={item.onOpen}>
            <span className={styles.text}>
              <strong className={styles.name}>{item.name}</strong>
              {item.line && <span className={styles.line}>{item.line}</span>}
            </span>
            {item.end}
          </button>
        </li>
      ))}
    </ul>
  );
}
