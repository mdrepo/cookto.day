// What a kitchen has and what a dish still needs (ADR 0027, specs/72, 97).
// One place for the rule, so Today, Dishes and a dish's page agree.

/**
 * The staples to assume are in the kitchen: all of them until the household
 * adds one of its own, then only the ones it added.
 */
export function assumedStaples(
  all: ReadonlySet<string>,
  pantry: readonly { ingredient: string }[],
): Set<string> {
  return pantry.some((i) => all.has(i.ingredient)) ? new Set() : new Set(all);
}

/** The ingredients the kitchen doesn't have, in the dish's order. */
export function missing(
  ingredients: readonly string[],
  have: ReadonlySet<string>,
  staples: ReadonlySet<string>,
): string[] {
  return ingredients.filter((i) => !have.has(i) && !staples.has(i));
}
