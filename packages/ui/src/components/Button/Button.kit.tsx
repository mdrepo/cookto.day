import { KIT, words, type Kit } from "../../kit.js";
import { Button } from "./Button.js";

export const kit: Kit = {
  name: "Button",
  about:
    "An action. One main button per screen; quiet for the rest; danger for removing.",
  examples: [
    { title: "Main", render: (lang) => <Button>{words[lang].addBill}</Button> },
    {
      title: "Quiet",
      render: (lang) => <Button kind="quiet">{words[lang].cancel}</Button>,
    },
    {
      title: "Danger",
      render: (lang) => <Button kind="danger">{words[lang].remove}</Button>,
    },
    {
      title: "Busy",
      render: (lang) => <Button busy>{words[lang].saving}</Button>,
    },
    {
      title: "Disabled",
      render: (lang) => <Button disabled>{words[lang].save}</Button>,
    },
    {
      title: "With an icon",
      render: (lang) => <Button icon="plus">{words[lang].addBill}</Button>,
    },
    {
      title: "Icon only",
      render: (lang) => (
        <span className={KIT.row}>
          <Button kind="quiet" icon="trash-2" label={words[lang].remove} />
          <Button kind="danger" icon="x" label={words[lang].cancel} />
        </span>
      ),
    },
  ],
};
