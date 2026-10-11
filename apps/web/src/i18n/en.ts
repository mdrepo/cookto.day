// Every word the app shows, in English. The other languages must have every
// key here (TypeScript checks it), so a new string starts in this file
// (ADR 0012).
export const en = {
  tagline: "What to cook today, from what's already in your kitchen",
  languageLabel: "Language",
  emptyTitle: "Your kitchen is empty",
  emptyBody: "Add a grocery bill to see what you can cook today",
  privacy: "Your bills and pantry stay in this browser. Nothing is uploaded.",
};

export type Messages = Record<keyof typeof en, string>;
