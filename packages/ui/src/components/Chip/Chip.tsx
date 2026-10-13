import type { ComponentProps, ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./Chip.module.css";

type Native = Omit<
  ComponentProps<"button">,
  "className" | "style" | "children" | "type" | "aria-pressed"
>;

export interface ChipProps extends Native {
  /** Ticked or not: screen readers hear which. */
  pressed: boolean;
  children: ReactNode;
}

/** One choice that's on or off, like a meal someone eats: a toggle button. */
export function Chip({ pressed, children, ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={pressed}
      className={styles.chip}
    >
      {pressed && <Icon name="check" size="sm" />}
      <span>{children}</span>
    </button>
  );
}
