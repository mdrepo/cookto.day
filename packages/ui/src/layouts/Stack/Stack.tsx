import type { ReactNode } from "react";
import type { Space } from "../../tokens.js";
import { gapClass } from "../gap.js";
import styles from "./Stack.module.css";

export interface StackProps {
  /** The space between parts: a spacing step (`--space-<gap>`). */
  gap?: Space;
  children: ReactNode;
}

/** Parts one above the other, spaced by a spacing step. */
export function Stack({ gap = 4, children }: StackProps) {
  return <div className={`${styles.stack} ${gapClass(gap)}`}>{children}</div>;
}
