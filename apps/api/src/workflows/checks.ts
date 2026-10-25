import type { RunRow } from "@cookto/db";
import type { MealSlot } from "@cookto/engine";
import { cooksOn } from "@cookto/engine/schedule";
import {
  cookedMeal,
  type MealToday,
  mealsOn,
  ranOut,
} from "../household/meals.js";
import { clockOf, schedule } from "../household/schedule.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import type { Action, Starter } from "./deps.js";
import { finish } from "./engine.js";
import { runId, say } from "./tomorrow.js";

// The cook's meal checks (specs/242): the starter that asks her an hour
// after each meal, on a day the plan went to her and she cooks, and brings
// what she left unanswered together an hour after the day's last check;
// and the actions her answers run. Each run's id comes from what it's for,
// so the cron making it twice makes it once.

const LATEST = 23 * 60 + 59;

const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** An hour later, "14:00" from "13:00"; never past 23:59. */
const hourAfter = (hhmm: string) => {
  const t = Math.min(minutes(hhmm) + 60, LATEST);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

const checkRun = (household: string, day: string, slot: string) =>
  runId(`${household}:check:${day}:${slot}`);
const dayEndRun = (household: string, day: string) =>
  runId(`${household}:day_end:${day}`);

type Meal = Omit<MealToday, "slot"> & { slot: string };

/** The planners hear a meal wasn't made, and why. */
async function notMade(
  d: MessengerDeps,
  run: RunRow,
  key: string,
  reason: string,
  meal: Meal = run.about as unknown as Meal,
) {
  await d.households.reachPlanners(
    run.household,
    d.messenger.channel.name,
    iso(d.now()),
  );
  await say(d, run, `${key}:${meal.slot}`, "not_made", "planners", {
    Meal: meal.Meal,
    reason,
  });
}

const cooked = (d: MessengerDeps, run: RunRow, slot: string) =>
  cookedMeal(
    d.households,
    run.household,
    String(run.about.date),
    slot as MealSlot,
    () => iso(d.now()),
    d.packs,
  );

const mealsOf = (run: RunRow) =>
  (Array.isArray(run.about.checks) ? run.about.checks : []) as Meal[];

/** "Some of them": the next unanswered meal, asked on its own. */
async function nextMeal(d: MessengerDeps, run: RunRow, key: string) {
  const [first, ...rest] = mealsOf(run);
  if (!first) return;
  await say(d, run, key, "meal_again", "cooks", {
    ...first,
    date: run.about.date,
    checks: rest,
  });
}

export const CHECK_ACTIONS: Record<string, Action> = {
  made: async ({ run, key, d }) => {
    await cooked(d, run, String(run.about.slot));
    if (run.workflow === "meal_again") await nextMeal(d, run, key);
  },
  madeOther: ({ run, key, d }) => notMade(d, run, key, "made other food"),
  didntCook: ({ run, key, d }) => notMade(d, run, key, "didn't cook it"),
  notSaid: async ({ run, key, d }) => {
    await notMade(d, run, key, "didn't say");
    await nextMeal(d, run, key);
  },
  ranOut: async ({ run, key, input, d }) => {
    const text = input.kind === "text" ? input.text.trim() : "";
    const now = () => iso(d.now());
    const foods = await ranOut(d.households, run.household, text, now, d.packs);
    if (foods.length > 0)
      await say(d, run, key, "check_added", "cooks", {
        foods: foods.join(", "),
      });
    await notMade(d, run, key, `ran out of ${text}`);
  },
  madeAll: async ({ run, d }) => {
    for (const meal of mealsOf(run)) await cooked(d, run, meal.slot);
  },
  noneMade: async ({ run, key, d }) => {
    for (const meal of mealsOf(run))
      await notMade(d, run, key, "didn't say", meal);
  },
  eachInTurn: ({ run, key, d }) => nextMeal(d, run, key),
};

/**
 * The day's end: the open checks closed, so their buttons are done; the
 * ones she never answered asked together; a No without its why told to
 * the planners as "didn't say".
 */
async function endDay(
  d: MessengerDeps,
  household: string,
  day: string,
  checks: (Meal & { run: RunRow | null })[],
  expiresAt: string,
) {
  const w = d.workflows;
  if (!w || (await w.runs.get(dayEndRun(household, day)))) return;
  const open = checks.filter((c) => c.run?.status === "waiting");
  for (const c of open) if (c.run) await finish(d, c.run.id);
  for (const c of open)
    if (c.run && c.run.step !== "ask")
      await notMade(d, c.run, `${c.run.id}:end`, "didn't say");
  const unanswered = open
    .filter((c) => c.run?.step === "ask")
    .map((c) => ({
      slot: c.slot,
      meal: c.meal,
      Meal: c.Meal,
      dishes: c.dishes,
    }));
  if (unanswered.length === 0) return;
  const now = iso(d.now());
  await w.runs.create({
    id: dayEndRun(household, day),
    household,
    audience: "cooks",
    workflow: "day_end",
    about: {
      date: day,
      meals: unanswered.map((m) => m.meal).join(", "),
      checks: unanswered,
    },
    dueAt: now,
    expiresAt,
    now,
  });
}

/** An hour after each meal, its check; an hour after the last, the day's. */
export const startChecks: Starter = async (d) => {
  const w = d.workflows;
  if (!w || w.off) return;
  const now = d.now();
  for (const { id, botOff } of await d.households.list()) {
    if (botOff) continue;
    const s = await schedule(d.households, id);
    const clock = clockOf(s, iso(now));
    if (!clock || !cooksOn(clock.day, s)) continue;
    const meals = await mealsOn(
      d.households,
      w.templates,
      id,
      clock.day,
      d.packs,
    );
    if (meals.length === 0) continue;
    const checks = await Promise.all(
      meals.map(async (m) => ({
        ...m,
        at: hourAfter(s.mealTimes[m.slot]),
        run: await w.runs.get(checkRun(id, clock.day, m.slot)),
      })),
    );
    const last = checks.reduce((a, c) => (c.at > a ? c.at : a), "00:00");
    const minute = now - (now % 60_000);
    const sixAm = iso(minute + (24 * 60 + 360 - minutes(clock.time)) * 60_000);
    if (clock.time >= hourAfter(last)) {
      await endDay(d, id, clock.day, checks, sixAm);
      continue;
    }
    // Tonight's "Looks good" moves sorted on to tomorrow: today's checks
    // already begun still went to her.
    const sent =
      s.sorted === clock.day ||
      (s.sorted !== null && s.sorted > clock.day && checks.some((c) => c.run));
    if (!sent) continue;
    for (const { at, run, ...meal } of checks) {
      if (clock.time < at || run) continue;
      await w.runs.create({
        id: checkRun(id, clock.day, meal.slot),
        household: id,
        audience: "cooks",
        workflow: "meal_check",
        about: { date: clock.day, ...meal },
        dueAt: iso(now),
        expiresAt: sixAm,
        now: iso(now),
      });
    }
  }
};
