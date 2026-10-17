import { words, type Kit } from "../../kit.js";
import { CheckList } from "./CheckList.js";

// CheckList on the kit page: a shopping list to tick off.
export const kit: Kit = {
  name: "CheckList",
  about: "A list to tick off, like the shopping list: each row a checkbox.",
  examples: [
    {
      title: "A shopping list",
      render: (lang) => (
        <CheckList
          label={words[lang].shoppingList}
          items={[
            {
              key: "onion",
              label: words[lang].onion,
              onCheck: () => undefined,
            },
            {
              key: "spinach",
              label: words[lang].spinach,
              onCheck: () => undefined,
            },
          ]}
        />
      ),
    },
  ],
};
