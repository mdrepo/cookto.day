import { words, type Kit } from "../../kit.js";
import { Steps } from "./Steps.js";

export const kit: Kit = {
  name: "Steps",
  about: "Where someone is in a few steps: in words, and a bar per step.",
  examples: [
    {
      title: "Step 1 of 2",
      render: (lang) => (
        <Steps current={1} total={2} label={words[lang].step1of2} />
      ),
    },
    {
      title: "Step 2 of 2",
      render: (lang) => (
        <Steps current={2} total={2} label={words[lang].step2of2} />
      ),
    },
  ],
};
