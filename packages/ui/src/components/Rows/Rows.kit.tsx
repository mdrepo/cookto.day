import { words, type Kit } from "../../kit.js";
import { Rows } from "./Rows.js";

export const kit: Kit = {
  name: "Rows",
  about:
    "A short list of labels with their values: each meal, and who it's for. A quiet value is muted.",
  examples: [
    {
      title: "Meals",
      render: (lang) => {
        const w = words[lang];
        return (
          <Rows
            label={w.meals}
            rows={[
              { key: "breakfast", label: w.breakfast, value: w.child },
              { key: "lunch", label: w.lunch, value: w.everyone },
              {
                key: "evening",
                label: w.eveningSnack,
                value: w.notPlanned,
                quiet: true,
              },
            ]}
          />
        );
      },
    },
  ],
};
