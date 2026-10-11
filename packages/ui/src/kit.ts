import type { ReactNode } from "react";

// The shape of a component's kit file, `<Name>.kit.tsx` (ADR 0019). The kit
// page (apps/kit) shows every example in light and dark, English and Arabic.

/** The two languages the kit shows: one left to right, one right to left. */
export type KitLanguage = "en" | "ar";

export interface KitExample {
  /** The state it shows, in a few words: "Disabled", "With a problem". */
  title: string;
  render: (language: KitLanguage) => ReactNode;
}

export interface Kit {
  /** The component's name, as it's imported. */
  name: string;
  /** What it's for, in one sentence. */
  about: string;
  examples: KitExample[];
}

/** Words for the examples, in both languages: the app's own, where it has them. */
export const words = {
  en: {
    language: "Language",
    chooseLanguage: "Choose a language",
    emptyTitle: "Your kitchen is empty",
    emptyBody: "Add a grocery bill to see what you can cook today",
    privacy: "Your bills and pantry stay in this browser. Nothing is uploaded.",
  },
  ar: {
    language: "اللغة",
    chooseLanguage: "اختر لغة",
    emptyTitle: "مطبخك فارغ",
    emptyBody: "أضف فاتورة بقالة لترى ما يمكنك طبخه اليوم",
    privacy: "تبقى فواتيرك ومخزونك في هذا المتصفح. لا يتم رفع أي شيء.",
  },
} satisfies Record<KitLanguage, Record<string, string>>;

/** The languages, each named in its own script, for example selects. */
export const LANGUAGES = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["mr", "मराठी"],
  ["ar", "العربية"],
] as const;
