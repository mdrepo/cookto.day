import { useWords } from "../../i18n/useWords.js";
import { goHome, open, type Route } from "../../routes.js";

const TABS = [
  { key: "home", word: "today", icon: "cooking-pot" },
  { key: "pantry", word: "pantry", icon: "refrigerator" },
  { key: "dishes", word: "dishes", icon: "file-text" },
] as const;

/** The bar at the bottom: Today, Pantry and Dishes (specs/80, criterion 3). */
export function useTabs(current: Route) {
  const { t } = useWords();
  return {
    label: t.pages,
    tabs: TABS.map((tab) => ({
      key: tab.key,
      label: t[tab.word],
      icon: tab.icon,
      current: tab.key === current,
    })),
    onPick: (key: string) => {
      if (key === "home") goHome();
      else if (key === "pantry" || key === "dishes") open(key);
    },
  };
}
