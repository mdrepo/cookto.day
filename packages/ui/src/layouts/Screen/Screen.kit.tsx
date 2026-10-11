import { EmptyState } from "../../components/EmptyState/EmptyState.js";
import { Note } from "../../components/Note/Note.js";
import { words, type Kit } from "../../kit.js";
import { Screen } from "./Screen.js";

export const kit: Kit = {
  name: "Screen",
  about: "A whole page: its header, then one centred column, at most 40rem.",
  wide: true,
  examples: [
    {
      title: "A page",
      render: (lang) => (
        <Screen title="cookto.day" tagline={words[lang].tomorrow}>
          <EmptyState title={words[lang].emptyTitle}>
            {words[lang].emptyBody}
          </EmptyState>
          <Note>{words[lang].privacy}</Note>
        </Screen>
      ),
    },
  ],
};
