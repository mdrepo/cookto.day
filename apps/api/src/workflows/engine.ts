import type { Outgoing, RunRow } from "@cookto/db";
import type { Button, Conversation, Message } from "@cookto/messenger";
import { render } from "@cookto/templates";
import { type Advanced, accepts, advance, type Event } from "@cookto/workflows";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import { buttonValue, parseButton } from "./buttons.js";
import type { WorkflowDeps } from "./deps.js";

// The engine (ADR 0034): one transition is claim, act, commit. A press
// claims its run only at its step and revision; the actions run, keyed by
// run and step; one call moves the run and queues its messages. A press
// that loses changes nothing and hears "That's done already". The cron
// expires runs, then starts the due ones.

type Result = "moved" | "stale" | "lost" | "not-accepted" | "off";

/**
 * One template's messages (specs/270): each line of its words a message of
 * its own, only the first with a sound, the buttons on the last.
 */
function build(
  w: WorkflowDeps,
  run: RunRow,
  step: string,
  m: Advanced["messages"][number],
): Message[] {
  const r = render(w.templates, "en", m.template, run.about);
  // A page opens in the chat and comes back as nothing: it's always shown.
  const buttons: Button[] = r.buttons
    .filter((b) => b.page !== undefined || !m.keys || m.keys.includes(b.key))
    .map((b) =>
      b.page !== undefined
        ? { label: b.label, app: b.page }
        : { label: b.label, value: buttonValue(run.id, step, b.key) },
    );
  const lines = r.text.split("\n").filter((line) => line.trim() !== "");
  const rows = r.kind === "choices" ? buttons.map((b) => [b]) : [buttons];
  return lines.map((text, i): Message => {
    const quiet = i > 0 ? { silent: true } : {};
    return i === lines.length - 1 && buttons.length > 0
      ? { kind: "buttons", text, buttons: rows, ...quiet }
      : { kind: "text", text, ...quiet };
  });
}

async function transition(
  d: MessengerDeps,
  w: WorkflowDeps,
  run: RunRow,
  event: Event,
): Promise<Result> {
  const flow = w.workflows[run.workflow];
  if (!flow) return "stale";
  const outcome = advance(flow, run.step, event);
  if ("refused" in outcome) return outcome.refused;
  const now = d.now();
  const claimed = await w.runs.claim(
    run.id,
    run.step,
    run.rev,
    iso(now),
    iso(now + w.leaseMs),
  );
  if (!claimed) return "lost";
  const key = `${run.id}:${run.step ?? "start"}`;
  for (const a of outcome.actions) {
    const act = w.actions[a.name];
    if (!act) throw new Error(`no-action:${a.name}`);
    await act({ run: claimed, key, input: a.input, d });
  }
  const to =
    outcome.messages.length > 0 ? await w.runs.conversations(run.id) : [];
  const outgoing: Outgoing[] = outcome.messages.flatMap((m) => {
    const messages = build(w, claimed, outcome.step, m);
    return to.flatMap((conversation) =>
      messages.map((message) => ({
        conversation,
        message,
        context: { run: run.id },
      })),
    );
  });
  const next = {
    step: outcome.step,
    status: outcome.status,
    floor: outcome.floor,
  };
  const done = await w.runs.commit(
    run.id,
    claimed.rev,
    next,
    outgoing,
    iso(now),
  );
  if (done.ok && outgoing.length > 0) d.after(d.messenger.drain());
  return done.ok ? "moved" : "lost";
}

/**
 * A run just made, started now rather than at the next cron (specs/241:
 * the cook gets her plan straight away). Whether it moved.
 */
export async function begin(d: MessengerDeps, run: RunRow): Promise<boolean> {
  const w = d.workflows;
  if (!w || w.off) return false;
  return (await transition(d, w, run, { kind: "start" })) === "moved";
}

/**
 * A waiting run ended without a word: what it asked was answered somewhere
 * else (specs/241: "Looks good" in the app). Its buttons are done already.
 */
export async function finish(d: MessengerDeps, id: string): Promise<void> {
  const w = d.workflows;
  const run = w ? await w.runs.get(id) : null;
  if (!w || run?.status !== "waiting") return;
  const now = d.now();
  const claimed = await w.runs.claim(
    run.id,
    run.step,
    run.rev,
    iso(now),
    iso(now + w.leaseMs),
  );
  if (!claimed) return;
  await w.runs.commit(
    run.id,
    claimed.rev,
    { step: "end", status: "done", floor: false },
    [],
    iso(now),
  );
}

/**
 * Expired runs ended, the starters' new runs made, then due runs started;
 * nothing while it's off.
 */
export async function tick(
  d: MessengerDeps,
): Promise<{ started: number; expired: number }> {
  const w = d.workflows;
  const counts = { started: 0, expired: 0 };
  if (!w || w.off) return counts;
  const now = iso(d.now());
  for (const run of await w.runs.expired(now))
    if ((await transition(d, w, run, { kind: "expire" })) === "moved")
      counts.expired++;
  for (const start of w.starters ?? []) await start(d);
  // A run started here that holds its person's floor keeps the next waiting.
  const held = new Set<string>();
  for (const run of await w.runs.due(now)) {
    const who = `${run.household}/${run.audience}`;
    if (held.has(who)) continue;
    if ((await transition(d, w, run, { kind: "start" })) !== "moved") continue;
    counts.started++;
    if ((await w.runs.get(run.id))?.floor) held.add(who);
  }
  return counts;
}

/** A run's button, pressed: null when it isn't one. */
export async function pressed(
  d: MessengerDeps,
  conversation: Conversation,
  value: string,
): Promise<{ result: Result; doneAlready: boolean } | null> {
  const b = parseButton(value);
  const w = d.workflows;
  if (!b || !w) return null;
  if (w.off) return { result: "off", doneAlready: false };
  const run = await w.runs.get(b.run);
  if (run?.botOff) return { result: "off", doneAlready: false };
  const ours = run && (await w.runs.conversations(run.id));
  if (!run || !ours?.includes(conversation.id) || run.step !== b.step)
    return { result: "stale", doneAlready: true };
  const result = await transition(d, w, run, { kind: "button", key: b.key });
  return { result, doneAlready: result !== "moved" };
}

/** Her text or photo, to the open step that takes it: null when none does. */
export async function answered(
  d: MessengerDeps,
  conversation: Conversation,
  event: Extract<Event, { kind: "text" | "photo" }>,
): Promise<Result | null> {
  const w = d.workflows;
  if (!w || w.off || conversation.owner.kind !== "member") return null;
  for (const run of await w.runs.open(conversation.owner.id)) {
    const flow = w.workflows[run.workflow];
    const takes = flow ? accepts(flow, run.step) : null;
    if (!takes || !(event.kind === "text" ? takes.text : takes.photo)) continue;
    if ((await w.runs.get(run.id))?.botOff) return "off";
    return transition(d, w, run, event);
  }
  return null;
}
