import { clashes, tidy } from "../../packages/engine/src/names.js";

// packs:check on food names (specs/148): after tidying, a name points to one
// food, unless it's a word in packs/ask.json, where the app asks which.

export function nameProblems(
  foods: Readonly<Record<string, readonly string[]>>,
  ask: Readonly<Record<string, readonly string[]>>,
): string[] {
  const asking = Object.entries(ask).flatMap(([word, ids]) =>
    ids
      .filter((id) => !(id in foods))
      .map(
        (id) =>
          `packs/ask.json: "${word}" asks about ${id}, which has no ingredients/${id}.json.`,
      ),
  );
  const named = Object.entries(foods).map(([id, names]) => ({ id, names }));
  // A word to ask about covers a clash only if it asks about every food.
  const asked = new Map(Object.entries(ask).map(([w, ids]) => [tidy(w), ids]));
  const covered = (name: string, ids: readonly string[]) =>
    ids.every((id) => asked.get(name)?.includes(id));
  return [
    ...asking,
    ...clashes(named, {})
      .filter(({ name, foods: ids }) => !covered(name, ids))
      .map(
        ({ name, foods: ids }) =>
          `ingredients: "${name}" names both ${ids.join(" and ")}. Add it to packs/ask.json, so the app asks, or take it off one of them.`,
      ),
  ];
}
