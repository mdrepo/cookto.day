import { type Catalogues, LIMITS, type Template } from "./template.js";

// The template check (ADR 0034): every language has the same slots and
// button keys as English, and no template breaks WhatsApp's limits. The
// build fails on any problem, named by language and template.

const slotsOf = (t: Template) =>
  [...t.body.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1] ?? "")
    .sort()
    .join(",");

const keysOf = (t: Template) =>
  Object.keys(t.buttons ?? {})
    .sort()
    .join(",");

function limits(where: string, t: Template): string[] {
  const problems: string[] = [];
  for (const [key, label] of Object.entries(t.buttons ?? {}))
    if (label.length > LIMITS.label)
      problems.push(`${where}: label over 20 characters: ${key}`);
  if (t.body.length > LIMITS.body)
    problems.push(`${where}: body over 1,024 characters`);
  const n = Object.keys(t.buttons ?? {}).length;
  if (t.kind === "buttons" && n > LIMITS.buttons)
    problems.push(`${where}: more than 3 buttons`);
  if (t.kind === "choices" && n > LIMITS.choices)
    problems.push(`${where}: more than 10 choices`);
  for (const key of Object.keys(t.links ?? {}))
    if (!(key in (t.buttons ?? {})))
      problems.push(`${where}: a link with no button: ${key}`);
  return problems;
}

export function checkTemplates(catalogues: Catalogues): string[] {
  const problems: string[] = [];
  for (const [language, catalogue] of Object.entries(catalogues))
    for (const [id, t] of Object.entries(catalogue)) {
      const where = `${language}/${id}`;
      const en = catalogues.en[id];
      if (language !== "en" && !en) problems.push(`${where}: not in English`);
      if (language !== "en" && en) {
        if (slotsOf(t) !== slotsOf(en)) problems.push(`${where}: slots differ`);
        if (keysOf(t) !== keysOf(en)) problems.push(`${where}: buttons differ`);
      }
      problems.push(...limits(where, t));
    }
  return problems;
}
