// Tomorrow's plan as plain text (specs/195, specs/241): the same lines in
// "Share tomorrow" on the phone and in the bot's 10 pm message, so the app
// and the API write the plan one way. The caller has the words, in the
// reader's language: each meal and its dish, the child's dishes, tonight's
// prep, and what to buy.

export interface TomorrowParts {
  meals: readonly { label: string; dish: string }[];
  /** The child's own dishes' names (specs/145). */
  child: readonly string[];
  /** "Tonight: soak the chickpeas, for tomorrow's lunch". */
  tonight: readonly string[];
  /** The foods to buy, by name. */
  buy: readonly string[];
}

export interface TomorrowWords {
  /** "For the child: {dish}", filled. */
  childDish: (dish: string) => string;
  /** "Buy: {items}", filled with the foods in a list. */
  buy: (items: readonly string[]) => string;
}

/** The plan's lines, one per meal, then the child's, tonight's, and buy. */
export function tomorrowText(p: TomorrowParts, words: TomorrowWords): string {
  const lines = [
    ...p.meals.map((meal) => `${meal.label}: ${meal.dish}`),
    ...p.child.map(words.childDish),
    ...p.tonight,
  ];
  if (p.buy.length > 0) lines.push(words.buy(p.buy));
  return lines.join("\n");
}
