import { words, type Kit } from "../../kit.js";
import { Note } from "./Note.js";

export const kit: Kit = {
  name: "Note",
  about: "A quiet note for reassurance. Never for errors: Field shows those.",
  examples: [
    {
      title: "Privacy",
      render: (lang) => <Note>{words[lang].privacy}</Note>,
    },
  ],
};
