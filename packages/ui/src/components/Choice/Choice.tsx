import { useId, type ReactNode } from "react";
import { Tag } from "../Tag/Tag.js";
import styles from "./Choice.module.css";

export interface ChoiceOption {
  value: string;
  /** Its name: what a screen reader reads first. */
  title: ReactNode;
  /** A line under it: what choosing it means. */
  detail?: ReactNode;
  /** Words saying it can't be chosen yet ("Coming soon"); the card is then disabled. */
  soon?: string;
}

export interface ChoiceProps {
  /** The question, which names the group. */
  legend: ReactNode;
  /** The screen's title already asks it: screen readers still hear it. */
  hideLegend?: boolean;
  name: string;
  /** The chosen option's value. */
  value: string | null;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
}

/** One answer from a few cards: radio buttons, each a whole card to tap. */
export function Choice({
  legend,
  hideLegend = false,
  name,
  value,
  options,
  onChange,
}: ChoiceProps) {
  const id = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={hideLegend ? styles.hidden : styles.legend}>
        {legend}
      </legend>
      {options.map((option) => {
        const soonId = `${id}-${option.value}-soon`;
        return (
          <label
            key={option.value}
            className={`${styles.card} ${option.soon ? styles.soon : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.soon !== undefined}
              aria-describedby={option.soon ? soonId : undefined}
              onChange={() => {
                onChange(option.value);
              }}
              className={styles.radio}
            />
            <span className={styles.words}>
              <span className={styles.top}>
                <strong>{option.title}</strong>
                {option.soon && (
                  <span id={soonId}>
                    <Tag tone="outline">{option.soon}</Tag>
                  </span>
                )}
              </span>
              {option.detail && (
                <span className={styles.detail}>{option.detail}</span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
