import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "../Button/Button.js";
import styles from "./Sheet.module.css";

export interface SheetProps {
  open: boolean;
  /** What it's about ("Spinach"): names the dialog. */
  title: string;
  /** The close button's words, for screen readers ("Close"). */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  /** Drawn open in place, not over the page: for the kit page, which runs no script. */
  inPlace?: boolean;
}

/**
 * One thing's controls, in a sheet from the bottom over the page: the
 * browser's own modal dialog, so focus stays inside, Escape closes it, and
 * focus goes back where it was.
 */
export function Sheet({
  open,
  title,
  closeLabel,
  onClose,
  children,
  inPlace = false,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || inPlace) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, inPlace]);
  return (
    <dialog
      ref={ref}
      className={inPlace ? `${styles.sheet} ${styles.inPlace}` : styles.sheet}
      open={inPlace || undefined}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <Button kind="plain" icon="x" label={closeLabel} onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
