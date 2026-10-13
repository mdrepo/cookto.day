import { words, type Kit } from "../../kit.js";
import { TabBar } from "./TabBar.js";

export const kit: Kit = {
  name: "TabBar",
  about:
    "The bar at the bottom between the main pages; the one you're on is aubergine.",
  examples: [
    {
      title: "Today is current",
      render: (lang) => {
        const w = words[lang];
        return (
          <TabBar
            label={w.pages}
            onPick={() => undefined}
            tabs={[
              {
                key: "today",
                label: w.today,
                icon: "cooking-pot",
                current: true,
              },
              { key: "pantry", label: w.pantry, icon: "refrigerator" },
              { key: "dishes", label: w.dishes, icon: "file-text" },
            ]}
          />
        );
      },
    },
  ],
};
