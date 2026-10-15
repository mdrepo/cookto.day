import { type Kit, words } from "../../kit.js";
import { UndoBar } from "./UndoBar.js";

// UndoBar on the kit page: a change, and its way back.
export const kit: Kit = {
  name: "UndoBar",
  about:
    "What a one-tap change did, with Undo. Screen readers hear it; it stays until the screen moves on.",
  examples: [
    {
      title: "Something used up",
      render: (lang) => (
        <UndoBar undoLabel={words[lang].undo} onUndo={() => undefined}>
          {words[lang].carrots}
        </UndoBar>
      ),
    },
  ],
};
