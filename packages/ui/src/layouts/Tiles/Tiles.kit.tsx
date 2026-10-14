import { Pick } from "../../components/Pick/Pick.js";
import { words, type Kit } from "../../kit.js";
import { Tiles } from "./Tiles.js";

// Tiles on the kit page: lunch and dinner, side by side when there's room.
export const kit: Kit = {
  name: "Tiles",
  about:
    "Cards side by side when the screen has room, one above the other on a phone.",
  wide: true,
  examples: [
    {
      title: "Two meals",
      render: (lang) => (
        <Tiles>
          <Pick label={words[lang].lunch} dish={words[lang].palakPaneer} />
          <Pick label={words[lang].dinner} dish={words[lang].dish} />
        </Tiles>
      ),
    },
  ],
};
