import { words, type Kit } from "../../kit.js";
import { Button } from "../../components/Button/Button.js";
import { ActionBar } from "./ActionBar.js";

export const kit: Kit = {
  name: "ActionBar",
  about:
    "The actions at the bottom of a step, within the thumb's reach: the main one takes the room.",
  examples: [
    {
      title: "Back and next",
      render: (lang) => (
        <ActionBar below={<Button kind="plain">{words[lang].skip}</Button>}>
          <Button kind="quiet">{words[lang].back}</Button>
          <Button>{words[lang].next}</Button>
        </ActionBar>
      ),
    },
    {
      title: "One action",
      render: (lang) => (
        <ActionBar>
          <Button>{words[lang].next}</Button>
        </ActionBar>
      ),
    },
  ],
};
