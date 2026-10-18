import { type Kit, words } from "../../kit.js";
import { UndoBar } from "./UndoBar.js";

// UndoBar on the kit page: a change, and its way back.
export const kit: Kit = {
  name: "UndoBar",
  about:
    "What a one-tap change did, with Undo; or what went wrong, with OK. Screen readers hear it; it stays until the screen moves on.",
  examples: [
    {
      title: "Something used up",
      render: (lang) => (
        <UndoBar undoLabel={words[lang].undo} onUndo={() => undefined}>
          {words[lang].carrots}
        </UndoBar>
      ),
    },
    {
      title: "A problem",
      render: (lang) => (
        <UndoBar problem undoLabel={words[lang].ok} onUndo={() => undefined}>
          {words[lang].saveFailed}
        </UndoBar>
      ),
    },
  ],
};
