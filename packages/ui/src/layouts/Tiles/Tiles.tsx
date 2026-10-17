import type { ReactNode } from "react";
import styles from "./Tiles.module.css";

/**
 * Cards side by side when the screen has room, each at least 18rem, like
 * lunch and dinner on a laptop; one above the other on a phone (#80).
 */
export function Tiles({ children }: { children: ReactNode }) {
  return <div className={styles.tiles}>{children}</div>;
}
