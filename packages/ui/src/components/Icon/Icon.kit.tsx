import { KIT, words, type Kit } from "../../kit.js";
import { Icon } from "./Icon.js";

export const kit: Kit = {
  name: "Icon",
  about:
    "A small sign in the colour of its text. Read out with a label, skipped without one.",
  examples: [
    {
      title: "With a label",
      render: (lang) => <Icon name="trash-2" label={words[lang].remove} />,
    },
    {
      title: "Beside words",
      render: (lang) => (
        <span className={KIT.row}>
          <Icon name="carrot" />
          {words[lang].carrots}
        </span>
      ),
    },
    {
      title: "Back",
      render: (lang) => <Icon name="arrow-left" label={words[lang].back} />,
    },
    {
      title: "In text",
      render: (lang) => (
        <span className={KIT.row}>
          <Icon name="refrigerator" />
          {words[lang].fridge}
        </span>
      ),
    },
    {
      title: "In muted text",
      render: (lang) => (
        <span className={`${KIT.row} ${KIT.muted}`}>
          <Icon name="cooking-pot" />
          {words[lang].tomorrow}
        </span>
      ),
    },
    {
      title: "Sizes",
      render: () => (
        <span className={KIT.row}>
          <Icon name="cooking-pot" size="sm" />
          <Icon name="cooking-pot" size="md" />
          <Icon name="cooking-pot" size="lg" />
        </span>
      ),
    },
  ],
};
