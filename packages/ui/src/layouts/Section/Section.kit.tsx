import { ItemList } from "../../components/ItemList/ItemList.js";
import { Tag } from "../../components/Tag/Tag.js";
import { words, type Kit } from "../../kit.js";
import { Section } from "./Section.js";

const open = () => undefined;

export const kit: Kit = {
  name: "Section",
  about: "A part of a page under its small, muted title.",
  examples: [
    {
      title: "A section",
      render: (lang) => (
        <Section title={words[lang].fresh}>
          <ItemList
            label={words[lang].fresh}
            items={[
              {
                key: "onion",
                name: words[lang].onion,
                line: words[lang].onionLine,
                onOpen: open,
              },
            ]}
          />
        </Section>
      ),
    },
    {
      title: "Use soon",
      render: (lang) => (
        <Section title={words[lang].useSoon} tone="warn">
          <ItemList
            label={words[lang].useSoon}
            items={[
              {
                key: "spinach",
                name: words[lang].spinach,
                line: words[lang].spinachLine,
                end: <Tag tone="warn">{words[lang].useSoon}</Tag>,
                onOpen: open,
              },
            ]}
          />
        </Section>
      ),
    },
  ],
};
