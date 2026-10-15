import { type Kit, words } from "../../kit.js";
import { NextSteps } from "./NextSteps.js";

// NextSteps on the kit page: the first step next, then halfway through.
export const kit: Kit = {
  name: "NextSteps",
  about:
    "A few steps in order: done ones ticked, the next one a button, the rest waiting.",
  examples: [
    {
      title: "First step next",
      render: (lang) => (
        <NextSteps
          label={words[lang].fridge}
          doneLabel={words[lang].done}
          steps={[
            {
              key: "1",
              label: words[lang].shoppingList,
              state: "next",
              onPress: () => undefined,
            },
            { key: "2", label: words[lang].fridge, state: "later" },
            { key: "3", label: words[lang].cook, state: "later" },
          ]}
        />
      ),
    },
    {
      title: "Halfway",
      render: (lang) => (
        <NextSteps
          label={words[lang].fridge}
          doneLabel={words[lang].done}
          steps={[
            { key: "1", label: words[lang].shoppingList, state: "done" },
            {
              key: "2",
              label: words[lang].fridge,
              state: "next",
              onPress: () => undefined,
            },
            { key: "3", label: words[lang].cook, state: "later" },
          ]}
        />
      ),
    },
  ],
};
