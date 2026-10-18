import { useWords } from "../../i18n/useWords.js";
import { open, openSettings } from "../../routes.js";

/** More (specs/175): the packs, and Settings, each a row. */
export function useMoreScreen() {
  const { t } = useWords();
  return {
    title: t.more,
    rows: [
      {
        key: "packs",
        name: t.packs,
        icon: "cooking-pot" as const,
        onOpen: () => {
          open("cuisines");
        },
      },
      {
        key: "settings",
        name: t.settings,
        icon: "settings" as const,
        onOpen: openSettings,
      },
    ],
  };
}
