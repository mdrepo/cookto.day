import { bringBack } from "@cookto/usecases";
import { useState } from "react";
import { fill } from "./i18n/format.js";
import { useWords } from "./i18n/useWords.js";
import { kitchen } from "./platform.js";

/**
 * The last food used up, for "Onion used up · Undo" (#116), on any screen
 * with an item sheet: the Fridge and Today. It goes when they move on:
 * another food, "Add food", or another page.
 */
export function useUsedUpNote() {
  const { t } = useWords();
  const [usedUp, setUsedUp] = useState<{ id: string; name: string } | null>(
    null,
  );
  return {
    onUsedUp: (id: string, name: string) => {
      setUsedUp({ id, name });
    },
    clear: () => {
      setUsedUp(null);
    },
    note: usedUp && {
      text: fill(t.usedUpNote, { food: usedUp.name }),
      label: t.undo,
      run: () => {
        setUsedUp(null);
        void bringBack(kitchen, usedUp.id);
      },
    },
  };
}
