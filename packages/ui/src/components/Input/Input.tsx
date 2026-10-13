import type { ComponentProps } from "react";
import styles from "./Input.module.css";

export type InputProps = Omit<
  ComponentProps<"input">,
  "className" | "style" | "type"
> & {
  /** Plain text by default; the others the browser has for words. */
  type?: "text" | "search" | "email";
};

/** The browser's own text box, 44px tall. Always inside a Field, which names it. */
export function Input({ type = "text", ...rest }: InputProps) {
  return <input {...rest} type={type} className={styles.input} />;
}
