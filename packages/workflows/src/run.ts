import { END, type Step, type Workflow } from "./workflow.js";

// The runner (ADR 0034): where a run is and one event in; the actions to
// run, the templates to send, and where the run is next out. No words, no
// network, no database, so a workflow is tested as a script.

export type Event =
  | { kind: "start" }
  | { kind: "button"; key: string }
  | { kind: "text"; text: string }
  | { kind: "photo"; ref: string }
  | { kind: "expire" };

export interface Outgoing {
  template: string;
  /** The buttons to show, by key; all the template's when left out. */
  keys?: string[];
}

export interface Advanced {
  actions: { name: string; input: Event }[];
  messages: Outgoing[];
  step: string;
  status: "waiting" | "done" | "expired";
  /** The step takes her text or photo: it holds her floor. */
  floor: boolean;
}

export type Outcome = Advanced | { refused: "stale" | "not-accepted" };

/** What a step takes besides buttons. */
export function accepts(
  w: Workflow,
  step: string | null,
): { text: boolean; photo: boolean } {
  const s = step === null ? undefined : w.steps[step];
  return { text: s?.text !== undefined, photo: s?.photo !== undefined };
}

const waits = (s: Step) =>
  s.on !== undefined || s.text !== undefined || s.photo !== undefined;

/** Enter `step`, and the ones its `then` leads to. */
function enter(w: Workflow, step: string, input: Event): Advanced {
  const out: Advanced = {
    actions: [],
    messages: [],
    step,
    status: "done",
    floor: false,
  };
  for (let at = step, hops = 0; at !== END && hops < 20; hops++) {
    const s = w.steps[at];
    if (!s) break;
    out.step = at;
    if (s.action) out.actions.push({ name: s.action, input });
    if (s.sends) {
      const keys = Object.keys(s.on ?? {});
      out.messages.push(
        keys.includes("*") || keys.length === 0
          ? { template: s.sends }
          : { template: s.sends, keys },
      );
    }
    if (waits(s)) {
      const a = accepts(w, at);
      return { ...out, status: "waiting", floor: a.text || a.photo };
    }
    if (s.then === undefined) break;
    at = s.then;
    if (at === END) out.step = END;
  }
  return { ...out, step: END, status: "done" };
}

function next(s: Step, event: Event): string | undefined {
  if (event.kind === "button") return s.on?.[event.key] ?? s.on?.["*"];
  if (event.kind === "text") return s.text;
  if (event.kind === "photo") return s.photo;
  return undefined;
}

export function advance(
  w: Workflow,
  step: string | null,
  event: Event,
): Outcome {
  if (step === null)
    return event.kind === "start"
      ? enter(w, w.first, event)
      : { refused: "stale" };
  const s = w.steps[step];
  if (!s) return { refused: "stale" };
  if (event.kind === "expire")
    return {
      actions: w.onExpire ? [{ name: w.onExpire, input: event }] : [],
      messages: [],
      step,
      status: "expired",
      floor: false,
    };
  const to = next(s, event);
  if (to === undefined)
    return {
      refused:
        event.kind === "button" || event.kind === "start"
          ? "stale"
          : "not-accepted",
    };
  if (to === END)
    return {
      actions: [],
      messages: [],
      step: END,
      status: "done",
      floor: false,
    };
  return enter(w, to, event);
}
