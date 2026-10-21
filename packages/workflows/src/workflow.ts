// A workflow (ADR 0034): steps in TypeScript, their shape as data, so a
// chart can be drawn from them and the build can check them. A step sends a
// template, runs an action, and says where each button key, her text or her
// photo takes the run next; "end" ends it.

export const END = "end";

export interface Step {
  /** The template sent on entering the step. */
  sends?: string;
  /** The action run on entering the step. */
  action?: string;
  /** Where each button key goes; "*" for any of the template's. */
  on?: Record<string, string>;
  /** Where her text goes: the step takes text. */
  text?: string;
  /** Where her photo goes: the step takes photos. */
  photo?: string;
  /** Where to go at once, for a step that only sends or acts. */
  then?: string;
}

export interface Workflow {
  name: string;
  first: string;
  steps: Record<string, Step>;
  /** The action run when a waiting run expires. */
  onExpire?: string;
}

export function workflow(
  name: string,
  shape: Omit<Workflow, "name">,
): Workflow {
  return { name, ...shape };
}
