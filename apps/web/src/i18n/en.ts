// Every word the app shows, in English. The other languages must have every
// key here (TypeScript checks it), so a new string starts in this file
// (ADR 0012).
export const en = {
  tagline: "What to cook today, from what's already in your kitchen",
  languageLabel: "Language",
  languageSoon: "coming soon",
  emptyTitle: "Your kitchen is empty",
  emptyBody: "Add a grocery bill to see what you can cook today",
  privacy: "Your bills and pantry stay in this browser. Nothing is uploaded.",
  whereTitle: "Where do you live?",
  whereBody: "We use your currency, and read the bills your shops send.",
  comingSoon: "Coming soon",
  singapore: "Singapore",
  india: "India",
  uae: "United Arab Emirates",
  stepOf: "Step {n} of {total}",
  whoTitle: "Who eats at home?",
  whoBody: "Tick the meals each person eats at home. We plan those.",
  adult: "Adult",
  child: "Child",
  toddler: "Toddler",
  toddlerFood: "toddler food",
  nameOptional: "Name (optional)",
  meals: "Meals",
  removePerson: "Remove {name}",
  nobody: "Add at least one person.",
  breakfast: "Breakfast",
  morningSnack: "Morning snack",
  lunch: "Lunch",
  eveningSnack: "Evening snack",
  dinner: "Dinner",
  next: "Next",
  back: "Back",
  skip: "Skip for now",
  goToKitchen: "Go to my kitchen",
  allSet: "All set",
  plan: "We'll plan {meals} a day for {people}.",
  mealCount: { one: "{n} meal", other: "{n} meals" },
  peopleCount: { one: "{n} person", other: "{n} people" },
  everyone: "Everyone",
  notPlanned: "Not planned",
  changeAnyTime: "You can change this any time.",
  household: "{people} · {meals} a day",
  edit: "Edit",
};

/** Words that change with a number: CLDR's plural forms, "other" always. */
export type Plural = { other: string } & Partial<
  Record<Intl.LDMLPluralRule, string>
>;

export type Messages = {
  [K in keyof typeof en]: (typeof en)[K] extends string ? string : Plural;
};
