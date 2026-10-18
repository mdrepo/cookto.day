import { Button } from "../Button/Button.js";
import styles from "./Reminders.module.css";

export interface Reminder {
  key: string;
  /** What's due, in a few words: "Tonight: soak the chickpeas". */
  text: string;
  /** What it's for, small and muted: "Chole". */
  line?: string;
  /** Its buttons, the main one first. */
  actions: readonly { label: string; onPress: () => void }[];
}

/** What's due, like prep for tomorrow (#144): each with its buttons. */
export function Reminders({
  label,
  items,
}: {
  /** Names the list for screen readers: "Prep". */
  label: string;
  items: readonly Reminder[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className={styles.item}>
          <div className={styles.words}>
            <strong className={styles.text}>{item.text}</strong>
            {item.line && <span className={styles.line}>{item.line}</span>}
          </div>
          {item.actions.length > 0 && (
            <div className={styles.actions}>
              {item.actions.map((a, i) => (
                <Button
                  key={a.label}
                  kind={i === 0 ? "quiet" : "plain"}
                  onClick={a.onPress}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
