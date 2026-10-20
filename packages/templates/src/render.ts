import type { Catalogues, Kind, PluralForms } from "./template.js";

// Putting slots into a template's words (ADR 0034), the way the app does
// (apps/web/src/i18n/format.ts): "{name}" filled, counts in the language's
// plural forms. A template missing in a language is sent in English.

export type Slots = Record<string, unknown>;

export interface Rendered {
  kind: Kind;
  /** The language the words came from. */
  language: string;
  text: string;
  buttons: { key: string; label: string }[];
}

function fill(words: string, values: Record<string, string>): string {
  return words.replace(/\{(\w+)\}/g, (hole, name: string) =>
    name in values ? (values[name] ?? hole) : hole,
  );
}

function count(locale: string, forms: PluralForms, n: number): string {
  const form = forms[new Intl.PluralRules(locale).select(n)] ?? forms.other;
  return fill(form, { n: n.toLocaleString(locale) });
}

export function render(
  catalogues: Catalogues,
  language: string,
  id: string,
  slots: Slots = {},
): Rendered {
  const own = catalogues[language]?.[id];
  const template = own ?? catalogues.en[id];
  if (!template) throw new Error(`no-template:${id}`);
  const locale = own ? language : "en";
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(slots)) {
    const forms = template.plurals?.[name];
    if (forms && typeof value === "number")
      values[name] = count(locale, forms, value);
    else if (typeof value === "string" || typeof value === "number")
      values[name] = String(value);
  }
  return {
    kind: template.kind,
    language: locale,
    text: fill(template.body, values),
    buttons: Object.entries(template.buttons ?? {}).map(([key, label]) => ({
      key,
      label,
    })),
  };
}
