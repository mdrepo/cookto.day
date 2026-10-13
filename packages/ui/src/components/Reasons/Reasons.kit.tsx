import { words, type Kit } from "../../kit.js";
import { Reasons } from "./Reasons.js";

export const kit: Kit = {
  name: "Reasons",
  about:
    "Why something is suggested: a warm dot for food that needs using, aubergine for good news, a quiet one for what's missing.",
  examples: [
    {
      title: "Warm, good and quiet",
      render: (lang) => {
        const w = words[lang];
        return (
          <Reasons
            items={[
              { key: "uses", text: w.usesSpinach, tone: "warm" },
              { key: "has", text: w.hasEverything, tone: "good" },
              { key: "needs", text: w.needsOnion, tone: "quiet" },
            ]}
          />
        );
      },
    },
  ],
};
