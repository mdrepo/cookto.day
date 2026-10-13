import type { Plural } from "./en.js";

// Putting numbers and names into words (ADR 0012), in the page's language.

/** "Step {n} of {total}" with its values in: "Step 1 of 2". */
export function fill(
  words: string,
  values: Record<string, string | number>,
): string {
  return words.replace(/\{(\w+)\}/g, (hole, name: string) =>
    name in values ? String(values[name]) : hole,
  );
}

/** A count in words, in the form the language uses for it: "1 person", "2 people". */
export function count(locale: string, forms: Plural, n: number): string {
  const form = forms[new Intl.PluralRules(locale).select(n)] ?? forms.other;
  return fill(form, { n: n.toLocaleString(locale) });
}
