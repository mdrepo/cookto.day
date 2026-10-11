import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./Button.module.css";

type Native = Omit<
  ComponentProps<"button">,
  "className" | "style" | "children" | "type" | "aria-label"
>;

interface Common extends Native {
  /** main: the one action that matters most. quiet: the rest. danger: removes or undoes. */
  kind?: "main" | "quiet" | "danger";
  /** Working on it: says so, shows a turning circle, and can't be used again yet. */
  busy?: boolean;
  /** "submit" only inside a form that needs it. */
  type?: "button" | "submit";
}

/** Words, with an icon before them if it helps. Or an icon alone, with a label. */
export type ButtonProps = Common &
  (
    | { children: ReactNode; icon?: IconName; label?: never }
    | { children?: never; icon: IconName; label: string }
  );

/** An action: the browser's own button, in one of three kinds. */
export function Button({
  kind = "main",
  busy = false,
  type = "button",
  icon,
  label,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const className = [styles.button, styles[kind], label && styles.iconOnly]
    .filter(Boolean)
    .join(" ");
  const ignoreWhileBusy = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy) e.preventDefault();
    else onClick?.(e);
  };
  return (
    <button
      {...rest}
      type={type}
      className={className}
      aria-label={label}
      aria-busy={busy || undefined}
      aria-disabled={busy || undefined}
      onClick={ignoreWhileBusy}
    >
      {busy ? (
        <span className={styles.busy} data-testid="busy">
          <Icon name="loader-circle" />
        </span>
      ) : (
        icon && <Icon name={icon} />
      )}
      {children !== undefined && <span>{children}</span>}
    </button>
  );
}
