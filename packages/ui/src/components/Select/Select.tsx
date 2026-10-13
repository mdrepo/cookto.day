import type { ComponentProps } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./Select.module.css";

export type SelectProps = Omit<
  ComponentProps<"select">,
  "className" | "style" | "multiple"
> & {
  /** As wide as where it sits: in a sheet, for one hand. */
  wide?: boolean;
};

/**
 * A choice from a short list: the browser's own select, drawn by us, with
 * our arrow, so it's the same size everywhere. Safari otherwise draws its
 * own, 23px tall (specs/35-iphone.md).
 */
export function Select({ wide = false, ...props }: SelectProps) {
  return (
    <span className={wide ? `${styles.frame} ${styles.wide}` : styles.frame}>
      <select {...props} className={styles.select} />
      <span className={styles.arrow}>
        <Icon name="chevron-down" size="sm" />
      </span>
    </span>
  );
}
