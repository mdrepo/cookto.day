import { words, type Kit } from "../../kit.js";
import { Sheet } from "./Sheet.js";

export const kit: Kit = {
  name: "Sheet",
  about:
    "One thing's controls in a sheet from the bottom, over the page. Drawn in place here; Escape or Close shuts it in the app.",
  examples: [
    {
      title: "Open",
      render: (lang) => {
        const w = words[lang];
        return (
          <Sheet
            open
            inPlace
            title={w.spinach}
            closeLabel={w.close}
            onClose={() => undefined}
          >
            <p>{w.spinachLine}</p>
          </Sheet>
        );
      },
    },
  ],
};
