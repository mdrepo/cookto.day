import { useQuery } from "@tanstack/react-query";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { queries, shoppingQuery } from "../../platform.js";
import { open } from "../../routes.js";

/** "Shopping list (3)", which opens it; nothing when it's empty (specs/103). */
export function useListCount() {
  const { locale, t } = useWords();
  const { data: n = 0 } = useQuery(
    { ...shoppingQuery, select: (items) => items.length },
    queries,
  );
  if (n === 0) return null;
  return {
    label: count(locale, t.shoppingListCount, n),
    onOpen: () => {
      open("list");
    },
  };
}
