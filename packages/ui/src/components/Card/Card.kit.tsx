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
  ],
};
