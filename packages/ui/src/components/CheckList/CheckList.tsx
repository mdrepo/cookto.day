import styles from "./CheckList.module.css";

export interface CheckItem {
  key: string;
  label: string;
  /** Ticked: what happens next is the screen's (it may leave the list). */
  onCheck: () => void;
  /**
   * Ticked or not, when the screen keeps it, like "Found in your receipt"
   * (specs/129); left out, every row starts unticked.
   */
  checked?: boolean;
}

/**
 * A list to tick off, like the shopping list (specs/103): each row a
 * checkbox and its words, the whole row a tap target.
 */
export function CheckList({
  label,
  items,
}: {
  /** Names the list for screen readers. */
  label: string;
  items: readonly CheckItem[];
}) {
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          <label className={styles.row}>
            <input
              type="checkbox"
              className={styles.box}
              onChange={item.onCheck}
              {...(item.checked !== undefined && { checked: item.checked })}
            />
            <span>{item.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
