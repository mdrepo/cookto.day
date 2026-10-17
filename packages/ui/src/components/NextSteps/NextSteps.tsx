import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Tag } from "../Tag/Tag.js";
import styles from "./NextSteps.module.css";

export interface NextStep {
  key: string;
  label: string;
  /** done: ticked, with "Done". next: the one button. later: waits its turn. */
  state: "done" | "next" | "later";
  /** What pressing the next step does. */
  onPress?: () => void;
}

/**
 * A few steps in order, like setting up a kitchen (#115): what's done is
 * ticked, the next step is the one main button, and the rest wait.
 */
export function NextSteps({
  label,
  doneLabel,
  steps,
}: {
  /** Names the list for screen readers: "Set up your kitchen". */
  label: string;
  /** The word beside a done step: "Done". */
  doneLabel: string;
  steps: readonly NextStep[];
}) {
  return (
    <ol className={styles.list} aria-label={label}>
      {steps.map((step, i) => (
        <li key={step.key} className={styles.step} data-state={step.state}>
          <span className={styles.mark} aria-hidden="true">
            {step.state === "done" ? (
              <Icon name="check" size="sm" />
            ) : (
              (i + 1).toLocaleString()
            )}
          </span>
          {step.state === "next" ? (
            <Button onClick={step.onPress}>{step.label}</Button>
          ) : (
            <span className={styles.label}>{step.label}</span>
          )}
          {step.state === "done" && <Tag>{doneLabel}</Tag>}
        </li>
      ))}
    </ol>
  );
}
