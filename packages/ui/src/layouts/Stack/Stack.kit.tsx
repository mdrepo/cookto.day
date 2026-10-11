import { Note } from "../../components/Note/Note.js";
import { words, type Kit } from "../../kit.js";
import { Stack } from "./Stack.js";

const notes = (lang: "en" | "ar") => [
  <Note key="1">{words[lang].tomorrow}</Note>,
  <Note key="2">{words[lang].carrots}</Note>,
  <Note key="3">{words[lang].fridge}</Note>,
];

export const kit: Kit = {
  name: "Stack",
  about:
    "Parts one above the other, spaced by a spacing step. Most of a screen.",
  examples: [
    { title: "Gap 2", render: (lang) => <Stack gap={2}>{notes(lang)}</Stack> },
    { title: "Gap 6", render: (lang) => <Stack gap={6}>{notes(lang)}</Stack> },
  ],
};
