import type { RunRow } from "@cookto/db";
import { addDays } from "@cookto/engine";
import { cooksOn } from "@cookto/engine/schedule";
import { clockOf, schedule } from "../household/schedule.js";
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

/** A run made and started now, once for its seed. */
async function say(
  d: MessengerDeps,
  run: RunRow,
  seed: string,
  workflow: string,
  audience: string,
  about: Record<string, unknown>,
): Promise<void> {
  const w = d.workflows;
  const id = runId(`${seed}:${workflow}`);
  if (!w || (await w.runs.get(id))) return;
  const now = iso(d.now());
  const made = await w.runs.create({
    id,
    household: run.household,
    audience,
    workflow,
    about,
    dueAt: now,
    expiresAt: null,
    now,
  });
  await begin(d, made);
}

const dayOf = (run: RunRow) => String(run.about.date);

/** Sorted, and the plan as it stands now goes to the cook. */
async function sortAndSend(d: MessengerDeps, run: RunRow, key: string) {
  const w = d.workflows;
  if (!w) return;
  await sortDay(d.households, run.household, dayOf(run), iso(d.now()));
  const t = await tomorrowOf(
    d.households,
    w.templates,
    run.household,
    dayOf(run),
  );
  if (t) await say(d, run, key, "to_cook", "cooks", { ...t });
}

export const TOMORROW_ACTIONS: Record<string, Action> = {
  sendToCook: ({ run, key, d }) => sortAndSend(d, run, key),
  sorted: ({ run, d }) =>
    sortDay(d.households, run.household, dayOf(run), iso(d.now())),
  noCooking: async ({ run, key, d }) => {
    await dayOff(d.households, run.household, dayOf(run), iso(d.now()));
    await say(d, run, key, "to_cook_off", "cooks", { day: run.about.day });
  },
  sendAsPlanned: async ({ run, key, d }) => {
    await sortAndSend(d, run, key);
    await say(d, run, key, "sent_as_planned", "planners", {});
  },
};

/** Between 10 and 11 pm household time, tomorrow's question, once. */
export const startTomorrow: Starter = async (d) => {
  const w = d.workflows;
  if (!w || w.off) return;
  const now = d.now();
  for (const { id, botOff } of await d.households.list()) {
    if (botOff) continue;
    const s = await schedule(d.households, id);
    const clock = clockOf(s, iso(now));
    if (!clock || clock.time < ASK_FROM || clock.time >= SEND_AT) continue;
    const day = addDays(clock.day, 1);
    const runIdOf = tomorrowRun(id, day);
    if (s.sorted === day || (await w.runs.get(runIdOf))) continue;
    const t = await tomorrowOf(d.households, w.templates, id, day);
    if (!t) continue;
    await d.households.reachPlanners(id, d.messenger.channel.name, iso(now));
    const left = minutes(SEND_AT) - minutes(clock.time);
    const minute = now - (now % 60_000);
    await w.runs.create({
      id: runIdOf,
      household: id,
      audience: "planners",
      workflow: cooksOn(day, s) ? "tomorrow" : "tomorrow_off",
      about: { date: day, day: t.day, plan: t.plan, change: CHANGE },
      dueAt: iso(now),
      expiresAt: iso(minute + left * 60_000),
      now: iso(now),
    });
  }
};
