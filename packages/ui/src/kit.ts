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
    privacy: "Your bills and fridge stay in this browser. Nothing is uploaded.",
    remove: "Remove",
    carrots: "Carrots",
    back: "Back",
    seeRecipe: "See the recipe",
    shoppingList: "Shopping list",
    fridge: "Fridge",
    tomorrow: "Use by tomorrow",
    addBill: "Add a bill",
    cancel: "Cancel",
    saving: "Saving",
    save: "Save",
    dish: "Palak paneer",
    cook: "Cook it",
    done: "Done",
    undo: "Undo",
    saveFailed: "Couldn't save that. Try again.",
    ok: "OK",
    lunch: "Lunch",
    dinner: "Dinner",
    toddlerFood: "toddler food",
    comingSoon: "Coming soon",
    pastItsBest: "Past its best",
    palakPaneer: "Palak paneer",
    withRotiOrRice: "with Roti or Rice",
    usesSpinach: "Uses Spinach and Paneer",
    hasEverything: "Has everything",
    needsOnion: "Needs: Onion",
    otherIdeas: "Other ideas",
    today: "Today",
    pantry: "Pantry",
    dishes: "Dishes",
    pages: "Pages",
    spinach: "Spinach",
    spinachLine: "250 g · use within 3 days",
    useSoon: "Use soon",
    onion: "Onion",
    onionLine: "1 kg · use within 30 days",
    takeOut: "Take out",
    close: "Close",
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
    meals: "Meals",
    breakfast: "Breakfast",
    eveningSnack: "Evening snack",
    everyone: "Everyone",
    notPlanned: "Not planned",
    fresh: "Fresh",
    settings: "Settings",
    wednesday: "Wednesday 14 October",
    sampleKitchen: "Sample kitchen",
    sampleBody: "Pretend food, so you can look around.",
    chooseWhatYouCook: "Choose what you cook",
    clearSample: "Clear the sample",
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
    seeRecipe: "اقرأ الوصفة",
    shoppingList: "قائمة التسوق",
    fridge: "الثلاجة",
    tomorrow: "استخدمه بحلول الغد",
    addBill: "أضف فاتورة",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ",
    save: "حفظ",
    dish: "بالاك بانير",
    cook: "اطبخه",
    done: "تم",
    undo: "تراجع",
    saveFailed: "تعذّر الحفظ. حاول مرة أخرى.",
    ok: "حسنًا",
    lunch: "غداء",
    dinner: "عشاء",
    toddlerFood: "طعام الأطفال الصغار",
    comingSoon: "قريبًا",
    pastItsBest: "تجاوز أفضل حالاته",
    palakPaneer: "بالاك بانير",
    withRotiOrRice: "مع روتي أو أرز",
    usesSpinach: "يستخدم السبانخ والبانير",
    hasEverything: "كل شيء موجود",
    needsOnion: "يحتاج: بصل",
    otherIdeas: "أفكار أخرى",
    today: "اليوم",
    pantry: "المخزن",
    dishes: "الأطباق",
    pages: "الصفحات",
    spinach: "سبانخ",
    spinachLine: "250 غ · استخدمه خلال 3 أيام",
    useSoon: "استخدمه قريبًا",
    onion: "بصل",
    onionLine: "1 كغ · استخدمه خلال 30 يومًا",
    takeOut: "أخرِج",
    close: "إغلاق",
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
    meals: "الوجبات",
    breakfast: "فطور",
    eveningSnack: "وجبة خفيفة مسائية",
    everyone: "الجميع",
    notPlanned: "غير مخطط لها",
    fresh: "طازج",
    settings: "الإعدادات",
    wednesday: "الأربعاء 14 أكتوبر",
    sampleKitchen: "مطبخ تجريبي",
    sampleBody: "طعام للتجربة، لتتعرّف على التطبيق.",
    chooseWhatYouCook: "اختر ما تطبخه",
    clearSample: "احذف المطبخ التجريبي",
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
