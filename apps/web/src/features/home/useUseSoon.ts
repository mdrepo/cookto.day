import { useQuery } from "@tanstack/react-query";
import { useWords } from "../../i18n/useWords.js";
import { packStaples, useItemWords, useLoadedPacks } from "../../food.js";
import { pantryQuery, queries, today } from "../../platform.js";
import { open } from "../../routes.js";
import { pantryOrder } from "@cookto/engine";

/** Today's "Use soon": fresh food that needs using, most urgent first (specs/80, criterion 2). */
export function useUseSoon() {
  const { t } = useWords();
  const staples = packStaples(useLoadedPacks());
  const words = useItemWords();
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const day = today();
  return {
    title: t.useSoon,
    rows: pantryOrder(
      items.filter((i) => !staples.has(i.ingredient)),
      day,
    ).flatMap((item) => {
      const w = words(item, day);
      return w.warning
        ? [
            {
              key: item.id,
              name: w.name,
              line: w.line,
              warning: w.warning,
              onOpen: () => {
                open("pantry");
              },
            },
          ]
        : [];
    }),
  };
}
