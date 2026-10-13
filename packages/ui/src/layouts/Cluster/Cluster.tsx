import type { ReactNode } from "react";
import type { Space } from "../../tokens.js";
import { gapClass } from "../gap.js";
import styles from "./Cluster.module.css";

export interface ClusterProps {
  /** The space between parts, across and between lines: a spacing step. */
  gap?: Space;
  /** Each part takes an equal share of the row: buttons in a sheet. */
  fill?: boolean;
  children: ReactNode;
}

/** Parts side by side, wrapping onto the next line when they don't fit. */
export function Cluster({ gap = 2, fill = false, children }: ClusterProps) {
  const fills = fill ? ` ${styles.fill}` : "";
  return (
    <div className={`${styles.cluster} ${gapClass(gap)}${fills}`}>
      {children}
    </div>
  );
}
