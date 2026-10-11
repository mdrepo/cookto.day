import { words, type Kit } from "../../kit.js";
import { EmptyState } from "./EmptyState.js";

export const kit: Kit = {
  name: "EmptyState",
  about: "Nothing to show yet: one title, and one sentence on what to do next.",
  examples: [
    {
      title: "An empty kitchen",
      render: (lang) => (
        <EmptyState title={words[lang].emptyTitle}>
          {words[lang].emptyBody}
        </EmptyState>
      ),
    },
  ],
};
