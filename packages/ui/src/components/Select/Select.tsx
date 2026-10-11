import type { ComponentProps } from "react";
import styles from "./Select.module.css";

export type SelectProps = Omit<
  ComponentProps<"select">,
  "className" | "style" | "multiple"
>;

/** A choice from a short list: the browser's own select, styled. */
export function Select(props: SelectProps) {
  return <select {...props} className={styles.select} />;
}
