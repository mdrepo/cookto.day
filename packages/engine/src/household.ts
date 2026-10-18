// The household: its people, and the meals each of them eats (ADR 0026).
// Five slots, the same everywhere; each person ticks theirs, and the plan
// covers every slot at least one person eats.

/** The meal slots, in the day's order. */
export const MEAL_SLOTS = [
  "breakfast",
  "morning-snack",
  "lunch",
  "evening-snack",
  "dinner",
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEMBER_KINDS = ["adult", "child", "toddler"] as const;
/** A toddler is a child whose food also follows toddler rules. */
export type MemberKind = (typeof MEMBER_KINDS)[number];

export interface Member {
  id: string;
  kind: MemberKind;
  nickname?: string;
  meals: readonly MealSlot[];
}

/** The meals a new person starts with, from who they are. */
export function defaultMeals(kind: MemberKind): MealSlot[] {
  return kind === "adult" ? ["lunch", "dinner"] : [...MEAL_SLOTS];
}

/** Every slot at least one person eats, in the day's order. */
export function plannedSlots(members: readonly Member[]): MealSlot[] {
  return MEAL_SLOTS.filter((slot) => eatersOf(slot, members).length > 0);
}

/** The people a slot is planned for. */
export function eatersOf(slot: MealSlot, members: readonly Member[]): Member[] {
  return members.filter((m) => m.meals.includes(slot));
}

const isSlot = (value: unknown): value is MealSlot =>
  (MEAL_SLOTS as readonly unknown[]).includes(value);

/**
 * What's wrong with a person read back from storage or another phone, in
 * words; none means they can be planned for.
 */
export function memberProblems(value: unknown): string[] {
  const person = (value ?? {}) as { kind?: unknown; meals?: unknown };
  const problems: string[] = [];
  if (person.kind === undefined)
    problems.push("has no type: adult, child or toddler");
  else if (!(MEMBER_KINDS as readonly unknown[]).includes(person.kind))
    problems.push(
      `is a ${JSON.stringify(person.kind)}, not an adult, child or toddler`,
    );
  if (!Array.isArray(person.meals)) {
    problems.push("has no list of meals");
    return problems;
  }
  const seen = new Set<unknown>();
  for (const meal of person.meals as unknown[]) {
    if (!isSlot(meal))
      problems.push(`eats ${JSON.stringify(meal)}, which isn't a meal slot`);
    else if (seen.has(meal)) problems.push(`eats "${meal}" twice`);
    seen.add(meal);
  }
  return problems;
}

const isChild = (m: Member) => m.kind !== "adult";

/** A meal only children eat: their snacks, say. Theirs is the child's list (specs/145). */
export function childrenOnly(
  slot: MealSlot,
  members: readonly Member[],
): boolean {
  const eaters = eatersOf(slot, members);
  return eaters.length > 0 && eaters.every(isChild);
}

/**
 * How many a dish serves at a meal (specs/145): everyone who eats it; the
 * adults only, when the children have a dish of their own (`true`); or,
 * for that dish ("child"), the children.
 */
export function servings(
  slot: MealSlot,
  members: readonly Member[],
  childHasOwn: boolean | "child",
): number {
  const eaters = eatersOf(slot, members);
  if (childHasOwn === "child") return eaters.filter(isChild).length;
  return childHasOwn ? eaters.filter((m) => !isChild(m)).length : eaters.length;
}
