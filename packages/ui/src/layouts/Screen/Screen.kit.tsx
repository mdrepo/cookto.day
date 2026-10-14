import { Button } from "../../components/Button/Button.js";
import { EmptyState } from "../../components/EmptyState/EmptyState.js";
import { Note } from "../../components/Note/Note.js";
import { Section } from "../Section/Section.js";
import { words, type Kit } from "../../kit.js";
import { Screen } from "./Screen.js";

export const kit: Kit = {
  name: "Screen",
  about:
    "A whole page: a light header (a small line, the title, one action), then one centred column: at most 40rem, or 64rem on a wide screen, the same on every page.",
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
    {
      title: "With an action",
      render: (lang) => (
        <Screen
          title="cookto.day"
          eyebrow={words[lang].wednesday}
          action={
            <Button kind="plain" icon="settings" label={words[lang].settings} />
          }
        >
          <Section title={words[lang].useSoon} tone="warn">
            <Note>{words[lang].tomorrow}</Note>
          </Section>
        </Screen>
      ),
    },
  ],
};
