import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { saveProblems } from "../../platform.js";

/** The last failed save, in words, with "OK" to clear it (specs/138). */
export function useSaveProblem() {
  const { t } = useWords();
  const problem = useStore(saveProblems.store, (s) => s.problem);
  if (problem === null) return null;
  return {
    text: problem === "storage-full" ? t.saveFull : t.saveFailed,
    ok: t.ok,
    clear: () => {
      saveProblems.report(null);
    },
  };
}
