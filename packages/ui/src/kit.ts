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
  /** Shown full width, one panel above the other: for parts as wide as a screen. */
  wide?: boolean;
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
    remove: "Remove",
    carrots: "Carrots",
    back: "Back",
    fridge: "Fridge",
    tomorrow: "Use by tomorrow",
    addBill: "Add a bill",
    cancel: "Cancel",
    saving: "Saving",
    save: "Save",
    dish: "Palak paneer",
    cook: "Cook it",
    lunch: "Lunch",
    dinner: "Dinner",
    toddlerFood: "toddler food",
    comingSoon: "Coming soon",
    nameOptional: "Name (optional)",
    child: "Child",
    next: "Next",
    skip: "Skip for now",
    whereTitle: "Where do you live?",
    singapore: "Singapore",
    india: "India",
    sgDetail: "S$ · RedMart · Sheng Siong",
    inDetail: "₹ · Blinkit · Zepto",
    step1of2: "Step 1 of 2",
    step2of2: "Step 2 of 2",
  },
  ar: {
    language: "اللغة",
    chooseLanguage: "اختر لغة",
    emptyTitle: "مطبخك فارغ",
    emptyBody: "أضف فاتورة بقالة لترى ما يمكنك طبخه اليوم",
    privacy: "تبقى فواتيرك ومخزونك في هذا المتصفح. لا يتم رفع أي شيء.",
    remove: "إزالة",
    carrots: "جزر",
    back: "رجوع",
    fridge: "الثلاجة",
    tomorrow: "استخدمه بحلول الغد",
    addBill: "أضف فاتورة",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ",
    save: "حفظ",
    dish: "بالاك بانير",
    cook: "اطبخه",
    lunch: "غداء",
    dinner: "عشاء",
    toddlerFood: "طعام الأطفال الصغار",
    comingSoon: "قريبًا",
    nameOptional: "الاسم (اختياري)",
    child: "طفل",
    next: "التالي",
    skip: "تخطَّ الآن",
    whereTitle: "أين تعيش؟",
    singapore: "سنغافورة",
    india: "الهند",
    sgDetail: "S$ · RedMart · Sheng Siong",
    inDetail: "₹ · Blinkit · Zepto",
    step1of2: "الخطوة 1 من 2",
    step2of2: "الخطوة 2 من 2",
  },
} satisfies Record<KitLanguage, Record<string, string>>;

/**
 * The kit page's own classes (apps/kit/src/kit.css), for framing an example:
 * a part beside some words, or in muted text. The page allows no inline
 * styles (its CSP).
 */
export const KIT = { row: "kit-row", muted: "kit-muted" } as const;

/** The languages, each named in its own script, for example selects. */
export const LANGUAGES = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["mr", "मराठी"],
  ["ar", "العربية"],
] as const;
