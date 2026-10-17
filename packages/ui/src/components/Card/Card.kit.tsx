import { Button } from "../Button/Button.js";
import { KIT, words, type Kit } from "../../kit.js";
import { Card } from "./Card.js";

export const kit: Kit = {
  name: "Card",
  about: "One thing, like a dish or a pantry item, named by its title.",
  examples: [
    {
      title: "A dish",
      render: (lang) => (
        <Card title={words[lang].dish}>
          <span className={`${KIT.row} ${KIT.muted}`}>
            {words[lang].tomorrow}
          </span>
        </Card>
      ),
    },
    {
      title: "With actions",
      render: (lang) => (
        <Card title={words[lang].dish}>
          <span className={`${KIT.row} ${KIT.muted}`}>
            {words[lang].tomorrow}
          </span>
          <span className={KIT.row}>
            <Button icon="cooking-pot">{words[lang].cook}</Button>
            <Button kind="quiet">{words[lang].cancel}</Button>
          </span>
        </Card>
      ),
    },
    {
      title: "With an action",
      render: (lang) => (
        <Card
          title={words[lang].dish}
          action={<Button kind="plain" icon="x" label={words[lang].remove} />}
        >
          <span className={`${KIT.row} ${KIT.muted}`}>
            {words[lang].tomorrow}
          </span>
        </Card>
      ),
    },
    {
      title: "Folded to one line",
      render: (lang) => (
        <Card
          title={words[lang].dish}
          folded={{ summary: words[lang].tomorrow, onOpen: () => undefined }}
          action={<Button kind="plain" icon="x" label={words[lang].remove} />}
        >
          {words[lang].tomorrow}
        </Card>
      ),
    },
  ],
};
