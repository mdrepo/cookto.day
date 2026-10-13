import { words, type Kit } from "../../kit.js";
import { Tag } from "./Tag.js";

export const kit: Kit = {
  name: "Tag",
  about:
    "A small label beside what it describes: soft for a note, an outline for what isn't here yet, warn for food that needs using.",
  examples: [
    { title: "Soft", render: (lang) => <Tag>{words[lang].toddlerFood}</Tag> },
    {
      title: "Outline",
      render: (lang) => <Tag tone="outline">{words[lang].comingSoon}</Tag>,
    },
    {
      title: "Warning",
      render: (lang) => <Tag tone="warn">{words[lang].pastItsBest}</Tag>,
    },
  ],
};
