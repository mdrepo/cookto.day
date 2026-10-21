import type { Catalogue } from "@cookto/templates";
import { END, type Workflow } from "./workflow.js";

// The build check (ADR 0034): every template a step sends exists, every
// button key it names is on that template, and every step it leads to is
// defined. A mistake fails the build instead of a run at night.

export function checkWorkflows(
  workflows: Workflow[],
  templates: Catalogue,
): string[] {
  const problems: string[] = [];
  for (const w of workflows) {
    const defined = (step: string) => step === END || step in w.steps;
    if (!(w.first in w.steps))
      problems.push(`${w.name}: no first step ${w.first}`);
    for (const [name, s] of Object.entries(w.steps)) {
      const where = `${w.name}/${name}`;
      const template = s.sends === undefined ? undefined : templates[s.sends];
      if (s.sends !== undefined && !template)
        problems.push(`${where}: no template ${s.sends}`);
      for (const key of Object.keys(s.on ?? {}))
        if (key !== "*" && template && !(key in (template.buttons ?? {})))
          problems.push(`${where}: button ${key} not in ${s.sends ?? ""}`);
      const targets = [...Object.values(s.on ?? {}), s.text, s.photo, s.then];
      for (const to of targets)
        if (to !== undefined && !defined(to))
          problems.push(`${where}: no step ${to}`);
    }
  }
  return problems;
}
