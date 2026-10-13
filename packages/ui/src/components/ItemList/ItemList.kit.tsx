import { words, type Kit } from "../../kit.js";
import { Tag } from "../Tag/Tag.js";
import { ItemList } from "./ItemList.js";

export const kit: Kit = {
  name: "ItemList",
  about:
    "A short list where each row opens its item: the name, a line under it, a tag at the end.",
  examples: [
    {
      title: "Fresh food",
      render: (lang) => {
        const w = words[lang];
        return (
          <ItemList
            label={w.pantry}
            items={[
              {
                key: "spinach",
                name: w.spinach,
                line: w.spinachLine,
                end: <Tag tone="warn">{w.useSoon}</Tag>,
                onOpen: () => undefined,
              },
              {
                key: "onion",
                name: w.onion,
                line: w.onionLine,
                onOpen: () => undefined,
              },
            ]}
          />
        );
      },
    },
  ],
};
