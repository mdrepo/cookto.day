import { KIT, words, type Kit } from "../../kit.js";
import { Chip } from "./Chip.js";

export const kit: Kit = {
  name: "Chip",
  about:
    "One choice that's on or off, like a meal someone eats. Ticked chips are aubergine, with a tick.",
  examples: [
    {
      title: "Ticked",
      render: (lang) => <Chip pressed>{words[lang].lunch}</Chip>,
    },
    {
      title: "Not ticked",
      render: (lang) => <Chip pressed={false}>{words[lang].dinner}</Chip>,
    },
    {
      title: "Disabled",
      render: (lang) => (
        <Chip pressed={false} disabled>
          {words[lang].dinner}
        </Chip>
      ),
    },
    {
      title: "Several",
      render: (lang) => (
        <span className={KIT.row}>
          <Chip pressed>{words[lang].lunch}</Chip>
          <Chip pressed={false}>{words[lang].dinner}</Chip>
        </span>
      ),
    },
  ],
};
