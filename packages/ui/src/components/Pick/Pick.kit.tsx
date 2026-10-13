import { words, type Kit } from "../../kit.js";
import { Button } from "../Button/Button.js";
import { Reasons } from "../Reasons/Reasons.js";
import { Pick } from "./Pick.js";

export const kit: Kit = {
  name: "Pick",
  about:
    'The best dish for one meal, in large words, and why: the prototype\'s "Tonight".',
  examples: [
    {
      title: "A meal's pick",
      render: (lang) => {
        const w = words[lang];
        return (
          <Pick label={w.lunch} dish={w.palakPaneer} note={w.withRotiOrRice}>
            <Reasons
              items={[
                { key: "uses", text: w.usesSpinach, tone: "warm" },
                { key: "needs", text: w.needsOnion, tone: "quiet" },
              ]}
            />
            <div>
              <Button kind="plain">{w.otherIdeas}</Button>
            </div>
          </Pick>
        );
      },
    },
  ],
};
