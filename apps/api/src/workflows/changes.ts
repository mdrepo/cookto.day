import type { RunRow } from "@cookto/db";
import { addDays } from "@cookto/engine";
import { render } from "@cookto/templates";
import { type PlanMeal, planChanges, samePlan } from "@cookto/usecases";
import { cookWords, kitchenOf } from "../household/people.js";
import {
  clockOf,
  hourWords,
  schedule,
  whenLocal,
} from "../household/schedule.js";
import { APP, tomorrowOf } from "../household/tomorrow-plan.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import type { Action, WorkflowDeps } from "./deps.js";
import { runId, say, sentRun, startRun, tellPlanners } from "./tomorrow.js";

// A change after the plan went to the cook (specs/270). A phone's push that
// changes a day already sent makes a run due two minutes later; when it's
// due and the plan is still as that push left it, only what changed goes
// to her, with "Got it", or, when a changed meal starts within the hour,
// the planners say first. A meal that has started isn't sent.

const WAIT_MS = 2 * 60_000;
const SEEN_MS = 30 * 60_000;
/** Changes kept a day, at most: more is the plan made again. */
const KEPT = 30;

const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The latest of what went to the cook for `day`, and its number. */
async function lastSent(w: WorkflowDeps, household: string, day: string) {
  let last: { n: number; meals: PlanMeal[] } | null = null;
  for (let n = 0; n < KEPT; n++) {
    const run = await w.runs.get(sentRun(household, day, n));
    if (!run) break;
    last = { n, meals: (run.about.meals ?? []) as PlanMeal[] };
  }
  return last;
}

const mealsOn = async (
  d: MessengerDeps,
  w: WorkflowDeps,
  h: string,
  day: string,
) => (await tomorrowOf(d.households, w.templates, h, day))?.meals ?? [];

/**
 * A household's records changed: each day sent to the cook whose plan now
 * differs waits two minutes, then goes (specs/270).
 */
export async function planChanged(
  d: MessengerDeps,
  household: string,
): Promise<void> {
  const w = d.workflows;
  if (!w || w.off) return;
  const now = d.now();
  const clock = clockOf(await schedule(d.households, household), iso(now));
  if (!clock) return;
  for (const day of [clock.day, addDays(clock.day, 1)]) {
    const last = await lastSent(w, household, day);
    if (!last) continue;
    const meals = await mealsOn(d, w, household, day);
    if (samePlan(meals, last.meals)) continue;
    const minute = String(now - (now % 60_000));
    const seed = `${household}:${day}:${String(last.n)}:${minute}`;
    const id = runId(`${seed}:wait:${JSON.stringify(meals)}`);
    if (await w.runs.get(id)) continue;
    await w.runs.create({
      id,
      household,
      audience: "planners",
      workflow: "change_wait",
      about: { date: day, meals },
      dueAt: iso(now + WAIT_MS),
      expiresAt: null,
      now: iso(now),
    });
  }
}

/** What changed goes to the cook; the planners hear it went. */
async function sendChange(d: MessengerDeps, run: RunRow) {
  const about = run.about;
  const id = sentRun(run.household, String(about.date), Number(about.n));
  const change = { workflow: "plan_change", audience: "cooks", about };
  const seen = iso(d.now() + SEEN_MS);
  await startRun(d, run.household, id, change, seen);
  await d.households.reachPlanners(
    run.household,
    d.messenger.channel.name,
    iso(d.now()),
  );
  await say(d, run, id, "change_sent", "planners", { cook: about.cook });
}

/** Two minutes on: still the plan this change left, what changed goes. */
async function changeDue(d: MessengerDeps, run: RunRow) {
  const w = d.workflows;
  if (!w) return;
  const day = String(run.about.date);
  const last = await lastSent(w, run.household, day);
  const t = await tomorrowOf(d.households, w.templates, run.household, day);
  const meals = t?.meals ?? [];
  if (!last || !samePlan(meals, run.about.meals as PlanMeal[])) return;
  const s = await schedule(d.households, run.household);
  const clock = clockOf(s, iso(d.now()));
  if (!clock) return;
  const today = day === clock.day;
  const word = (id: string, slots = {}) =>
    render(w.templates, "en", id, slots).text;
  const when = word(today ? "word_today" : "word_tomorrow");
  const changes = planChanges(last.meals, meals, word, when).filter(
    (c) => !today || s.mealTimes[c.slot] > clock.time,
  );
  if (changes.length === 0) return;
  const k = await kitchenOf(d.households, run.household);
  const about = {
    date: day,
    n: last.n + 1,
    meals,
    opening: today
      ? word("change_today")
      : word("change_tomorrow", { day: t?.day ?? "" }),
    changes: changes.map((c) => c.line).join("\n"),
    recipes: t?.recipes ?? APP,
    ...cookWords(k, w.templates),
  };
  const close = today
    ? changes.find(
        (c) => minutes(s.mealTimes[c.slot]) - minutes(clock.time) <= 60,
      )
    : undefined;
  if (!close) {
    await sendChange(d, { ...run, about });
    return;
  }
  const at = s.mealTimes[close.slot];
  await startRun(
    d,
    run.household,
    runId(`${run.id}:close`),
    {
      workflow: "change_close",
      audience: "planners",
      about: {
        ...about,
        Meal: word(`meal_${close.slot.replace("-", "_")}`),
        time: hourWords(at),
      },
    },
    whenLocal(s, d.now(), day, at),
  );
}

export const CHANGE_ACTIONS: Record<string, Action> = {
  changeDue: ({ run, d }) => changeDue(d, run),
  sendChange: ({ run, d }) => sendChange(d, run),
  seenChange: ({ run, key, d }) => tellPlanners(d, run, key, "seen_change"),
  notSeenChange: ({ run, key, d }) =>
    tellPlanners(d, run, key, "not_seen_change"),
};
