import { addTypedToList, bought } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import { namer, useLoadedPacks } from "../../food.js";
import { kitchen, queries, shoppingQuery, today } from "../../platform.js";

/** Shares the list with the phone's share sheet, or copies it: says which. */
async function send(text: string): Promise<"shared" | "copied"> {
  if (typeof navigator.share === "function") {
    await navigator.share({ text });
    return "shared";
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

/**
 * The shopping list (specs/103): what to buy, ticked off into the fridge,
 * typed in, and sent as text, one thing a line.
 */
export function useShoppingScreen() {
  const { locale, t } = useWords();
  const name = namer(useLoadedPacks(), locale);
  const { data: items = [] } = useQuery(shoppingQuery, queries);
  const [copied, setCopied] = useState(false);
  const names = items.map((i) => name("ingredients", i.ingredient));
  return {
    title: t.shoppingList,
    empty: items.length === 0 ? t.nothingOnList : null,
    items: items.map((item, i) => ({
      key: item.id,
      label: names[i] ?? item.ingredient,
      onCheck: () => {
        void bought(kitchen, item, today(), locale);
      },
    })),
    add: {
      nameLabel: t.name,
      addLabel: t.add,
      run: (typed: string) => {
        void addTypedToList(kitchen, typed);
      },
    },
    send: {
      label: t.sendList,
      copied: copied ? t.copied : null,
      run: () => {
        void send(names.join("\n")).then((how) => {
          setCopied(how === "copied");
        });
      },
    },
  };
}
