import { useState } from "react";
import { fill } from "./i18n/format.js";
import { useWords } from "./i18n/useWords.js";
import { receipts } from "./platform.js";
import { openReceipt } from "./routes.js";

// Choosing a receipt photo (specs/129), from Today's "Add a receipt" or the
// Fridge's "Photo of a receipt": the phone's own camera or photos, then the
// receipt's screen, which takes the photo. It's held here only until then.

let chosen: Blob | null = null;

/** Opens the phone's camera or photos; a photo chosen opens the receipt. */
export function chooseReceiptPhoto(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    chosen = file;
    openReceipt();
  });
  input.click();
}

/** The photo just chosen, once: the receipt's screen takes it. */
export function takeChosenPhoto(): Blob | null {
  const photo = chosen;
  chosen = null;
  return photo;
}

/**
 * What "Add {n}" added, for the Fridge's Undo. It stays while they look at
 * the list and come back, until Undo or something else on the Fridge.
 */
export interface ReceiptAdded {
  count: number;
  added: { items: string[]; unlisted: string[] };
}

let added: ReceiptAdded | null = null;

export function setReceiptAdded(what: ReceiptAdded | null): void {
  added = what;
}

/** "Added 6 from your receipt · Undo" on the Fridge, and a way to let it go. */
export function useReceiptUndo() {
  const { t } = useWords();
  const [what, setWhat] = useState(() => added);
  const clear = () => {
    added = null;
    setWhat(null);
  };
  return {
    clear,
    note: what && {
      text: fill(t.addedFromReceipt, { n: what.count }),
      label: t.undo,
      run: () => {
        clear();
        void import("@cookto/usecases/receipt").then((use) =>
          use.undoReceipt(receipts, what.added),
        );
      },
    },
  };
}
