import type { RunRow } from "@cookto/db";
import { addDays } from "@cookto/engine";
import { cooksOn } from "@cookto/engine/schedule";
import {
  cookHello,
  cookWords,
  kitchenOf,
  plannerHello,
} from "../household/people.js";
import {
  clockOf,
  type Schedule,
  schedule,
  whenLocal,
} from "../household/schedule.js";
import { dayOff, sortDay } from "../household/settings-write.js";
import { CHANGE, tomorrowOf } from "../household/tomorrow-plan.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import type { Action, Starter } from "./deps.js";
import { begin } from "./engine.js";

// Tomorrow's plan in Telegram (specs/241): the starter that asks each
// household's planners at 10 pm their time, and the actions their answers
// run. Each run's id comes from what it's for, so the cron making it twice,
// or an action run twice, makes it once.

const ASK_FROM = "22:00";
const SEND_AT = "23:00";

/** 8 characters from a seed, the same every time (FNV-1a, base 36). */
export function runId(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `t${h.toString(36).padStart(7, "0")}`;
}

/** The planners' run for one household's tomorrow. */
export const tomorrowRun = (household: string, day: string) =>
  runId(`${household}:tomorrow:${day}`);

const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * What went to the cook for a day (specs/270): the plan, then each change,
 * numbered from 0, so the latest says what she has.
 */
export const sentRun = (household: string, day: string, n: number) =>
  runId(`${household}:${day}:sent:${String(n)}`);

/** A run with this id made and started now, once. */
export async function startRun(
  d: MessengerDeps,
  household: string,
  id: string,
  run: { workflow: string; audience: string; about: Record<string, unknown> },
  /** When a run that waits for an answer stops waiting (specs/270). */
  expiresAt: string | null = null,
): Promise<void> {
  const w = d.workflows;
  if (!w || (await w.runs.get(id))) return;
  const now = iso(d.now());
  const made = await w.runs.create({
    id,
    household,
    ...run,
    dueAt: now,
    expiresAt,
    now,
  });
  await begin(d, made);
}

/** A run made and started now, once for its seed. */
export async function say(
  d: MessengerDeps,
  run: RunRow,
  seed: string,
  workflow: string,
  audience: string,
  about: Record<string, unknown>,
  expiresAt: string | null = null,
): Promise<void> {
  const id = runId(`${seed}:${workflow}`);
  await startRun(
    d,
    run.household,
    id,
    { workflow, audience, about },
    expiresAt,
  );
}

const dayOf = (run: RunRow) => String(run.about.date);

/** "07:00" from "08:00": when the planners hear the plan wasn't seen. */
const hourBefore = (hhmm: string) => {
  const t = Math.max(minutes(hhmm) - 60, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

/**
 * Sorted, and the plan as it stands now goes to the cook, by name, with
 * "Got it"; unseen an hour before the day's first meal, the planners hear.
 */
async function sortAndSend(d: MessengerDeps, run: RunRow) {
  const w = d.workflows;
  if (!w) return;
  const day = dayOf(run);
  await sortDay(d.households, run.household, day, iso(d.now()));
  const t = await tomorrowOf(d.households, w.templates, run.household, day);
  if (!t) return;
  const k = await kitchenOf(d.households, run.household);
  const s = await schedule(d.households, run.household);
  const unseen = whenLocal(s, d.now(), day, hourBefore(s.mealTimes[t.first]));
  const about = {
    date: day,
    day: t.day,
    plan: t.cookPlan,
    recipes: t.recipes,
    hello: cookHello(k, w.templates, t.day),
    // What she has, to say later what changed, and when (specs/270).
    meals: t.meals,
    sentAt: iso(d.now()),
  };
  const later = unseen !== null && Date.parse(unseen) > d.now();
  await startRun(
    d,
    run.household,
    sentRun(run.household, day, 0),
    { workflow: "to_cook", audience: "cooks", about },
    later ? unseen : null,
  );
}

/** The planners hear about the cook's plan: seen, or not yet. */
export async function tellPlanners(
  d: MessengerDeps,
  run: RunRow,
  key: string,
  workflow: string,
) {
  const w = d.workflows;
  if (!w) return;
  const k = await kitchenOf(d.households, run.household);
  await d.households.reachPlanners(
    run.household,
    d.messenger.channel.name,
    iso(d.now()),
  );
  await say(d, run, key, workflow, "planners", cookWords(k, w.templates));
}

const sorted: Action = ({ run, d }) =>
  sortDay(d.households, run.household, dayOf(run), iso(d.now()));

export const TOMORROW_ACTIONS: Record<string, Action> = {
  sendToCook: ({ run, d }) => sortAndSend(d, run),
  sorted,
  noCooking: async ({ run, key, d }) => {
    await dayOff(d.households, run.household, dayOf(run), iso(d.now()));
    await say(d, run, key, "to_cook_off", "cooks", { day: run.about.day });
  },
  dayOff: ({ run, d }) =>
    dayOff(d.households, run.household, dayOf(run), iso(d.now())),
  sendAsPlanned: async ({ run, key, d }) => {
    await sortAndSend(d, run);
    await say(d, run, key, "sent_as_planned", "planners", {
      cook: run.about.cook,
    });
  },
  seen: ({ run, key, d }) => tellPlanners(d, run, key, "seen_plan"),
  notSeen: ({ run, key, d }) => tellPlanners(d, run, key, "not_seen_plan"),
};

/**
 * Tomorrow's question for one household, made at 10 pm (specs/241) or when
 * a planner sends /tomorrow (specs/270), once a day; unanswered, it goes as
 * planned at 11 pm. Null when there's nothing to ask.
 */
export async function askTomorrow(
  d: MessengerDeps,
  household: string,
  s: Schedule,
  clock: { day: string; time: string },
): Promise<RunRow | null> {
  const w = d.workflows;
  if (!w) return null;
  const now = d.now();
  const day = addDays(clock.day, 1);
  const runIdOf = tomorrowRun(household, day);
  if (s.sorted === day || (await w.runs.get(runIdOf))) return null;
  const t = await tomorrowOf(d.households, w.templates, household, day);
  if (!t) return null;
  const k = await kitchenOf(d.households, household);
  const cooking = cooksOn(day, s);
  // A day the planners don't cook: nothing to ask (specs/270).
  if (!cooking && !k.hasCook) return null;
  await d.households.reachPlanners(
    household,
    d.messenger.channel.name,
    iso(now),
  );
  const left = minutes(SEND_AT) - minutes(clock.time);
  const minute = now - (now % 60_000);
  return w.runs.create({
    id: runIdOf,
    household,
    audience: "planners",
    workflow: !cooking
      ? "tomorrow_off"
      : k.hasCook
        ? "tomorrow"
        : "tomorrow_self",
    about: {
      date: day,
      day: t.day,
      hello: plannerHello(k, w.templates, t.day),
      // The planners cook: tonight's prep is theirs.
      plan: k.hasCook ? t.plan : [t.plan, ...t.tonight].join("\n"),
      change: CHANGE,
      recipes: t.recipes,
      ...cookWords(k, w.templates),
    },
    dueAt: iso(now),
    expiresAt: left > 0 ? iso(minute + left * 60_000) : null,
    now: iso(now),
  });
}

/** Between 10 and 11 pm household time, tomorrow's question, once. */
export const startTomorrow: Starter = async (d) => {
  const w = d.workflows;
  if (!w || w.off) return;
  for (const { id, botOff } of await d.households.list()) {
    if (botOff) continue;
    const s = await schedule(d.households, id);
    const clock = clockOf(s, iso(d.now()));
    if (!clock || clock.time < ASK_FROM || clock.time >= SEND_AT) continue;
    await askTomorrow(d, id, s, clock);
  }
};
