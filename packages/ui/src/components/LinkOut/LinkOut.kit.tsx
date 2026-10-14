import { words, type Kit } from "../../kit.js";
import { LinkOut } from "./LinkOut.js";

// LinkOut on the kit page: a dish's recipe, on the site it's from.
export const kit: Kit = {
  name: "LinkOut",
  about:
    "A link to another site, naming the site; it opens in a new tab. A dish's recipe.",
  examples: [
    {
      title: "A recipe",
      render: (lang) => (
        <LinkOut href="https://www.vegrecipesofindia.com/palak-paneer/">
          {words[lang].seeRecipe}
        </LinkOut>
      ),
    },
  ],
};
