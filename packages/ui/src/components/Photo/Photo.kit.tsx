import { type Kit, words } from "../../kit.js";
import { Photo } from "./Photo.js";

// Photo on the kit page: a dish without a photo, wide and square. (The kit
// has no dish photos of its own; the app's come from its packs.)
export const kit: Kit = {
  name: "Photo",
  about:
    "A dish's photo: loads when near the screen, keeps its space, and shows a plain tile with the pot when there's none.",
  examples: [
    {
      title: "No photo, wide",
      render: (lang) => <Photo alt={words[lang].dish} shape="wide" />,
    },
    {
      title: "No photo, square",
      render: (lang) => <Photo alt={words[lang].dish} shape="square" />,
    },
  ],
};
