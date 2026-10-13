import { Note } from "../../components/Note/Note.js";
import { words, type Kit } from "../../kit.js";
import { Section } from "../Section/Section.js";
import { Panes } from "./Panes.js";

export const kit: Kit = {
  name: "Panes",
  about:
    "Two panes: side by side on a wide screen, one above the other on a phone.",
  wide: true,
  examples: [
    {
      title: "Two panes",
      render: (lang) => (
        <Panes
          primary={
            <Section title={words[lang].fresh}>
              <Note>{words[lang].onionLine}</Note>
            </Section>
          }
          secondary={
            <Section title={words[lang].useSoon} tone="warn">
              <Note>{words[lang].spinachLine}</Note>
            </Section>
          }
        />
      ),
    },
  ],
};
