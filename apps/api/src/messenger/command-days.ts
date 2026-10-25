import type { RunRow } from "@cookto/db";
import { addDays } from "@cookto/engine";
import { clockIn, dayWords } from "@cookto/engine/time";
import { render } from "@cookto/templates";
import { planMeals } from "@cookto/usecases";
import {
  cookHello,
  cookWords,
  type Kitchen,
  plannerHello,
} from "../household/people.js";
import { hourWords, type Schedule } from "../household/schedule.js";
import {
  CHANGE,
  live,
  planInputOf,
  tomorrowOf,
} from "../household/tomorrow-plan.js";
import type { WorkflowDeps } from "../workflows/deps.js";
import { begin } from "../workflows/engine.js";
import { askTomorrow, sentRun } from "../workflows/tomorrow.js";
import type { MessengerDeps } from "./deps.js";

// /tomorrow and /today (specs/270): tomorrow's question now, or how it
// went; today's meals, made or not; the cook's plan as she got it.

export interface Asked {
  d: MessengerDeps;
  w: WorkflowDeps;
  household: string;
  k: Kitchen;
  s: Schedule;
  clock: { day: string; time: string };
  /** Answers with a workflow's words, to the member who asked. */
  answer: (workflow: string, about: Record<string, unknown>) => Promise<void>;
}

const wordsOf =
  (a: Asked) =>
  (id: string, slots = {}) =>
    render(a.w.templates, "en", id, slots).text;

/** The plan, when it went to the cook, and whether she saw it. */
async function howItWent(a: Asked, day: string, sent: RunRow) {
  const word = wordsOf(a);
  const t = await tomorrowOf(a.d.households, a.w.templates, a.household, day);
  const lines = t ? [plannerHello(a.k, a.w.templates, t.day), t.plan] : [];
  const at = sent.about.sentAt;
  if (typeof at === "string" && a.s.timeZone)
    lines.push(
      word("cmd_sent_at", {
        cook: cookWords(a.k, a.w.templates).cook,
        time: hourWords(clockIn(a.s.timeZone, at).time),
      }),
    );
  if (sent.workflow === "to_cook")
    lines.push(word(sent.status === "done" ? "cmd_seen" : "cmd_not_seen"));
  await a.answer("cmd_said", { lines: lines.join("\n") });
  return "how-it-went";
}

/** A planner's /tomorrow: asked now, or how it went, or not planned yet. */
export async function plannersTomorrow(a: Asked): Promise<string> {
  const day = addDays(a.clock.day, 1);
  const sent = await a.w.runs.get(sentRun(a.household, day, 0));
  if (sent) return howItWent(a, day, sent);
  const asked = await askTomorrow(a.d, a.household, a.s, a.clock);
  if (asked) {
    await begin(a.d, asked);
    return "asked";
  }
  const t = await tomorrowOf(a.d.households, a.w.templates, a.household, day);
  if (!t) {
    await a.answer("cmd_not_planned", { page: CHANGE });
    return "not-planned";
  }
  const hello = plannerHello(a.k, a.w.templates, t.day);
  await a.answer("cmd_said", { lines: `${hello}\n${t.plan}` });
  return "plan";
}

/** The cook's /tomorrow: the plan as she got it, or when it comes. */
export async function cooksTomorrow(a: Asked): Promise<string> {
  const day = addDays(a.clock.day, 1);
  const sent = await a.w.runs.get(sentRun(a.household, day, 0));
  const t = await tomorrowOf(a.d.households, a.w.templates, a.household, day);
  if (!sent || !t) {
    await a.answer("cmd_said", { lines: wordsOf(a)("cmd_comes_at_ten") });
    return "not-yet";
  }
  const lines = `${cookHello(a.k, a.w.templates, t.day)}\n${t.cookPlan}`;
  await a.answer("cmd_said_recipes", { lines, recipes: t.recipes });
  return "plan";
}

/** /today: each meal, made, not made, or not yet; the cook's has Recipes. */
export async function today(a: Asked, cook: boolean): Promise<string> {
  const word = wordsOf(a);
  const day = a.clock.day;
  const h = a.d.households;
  const input = await planInputOf(h, a.w.templates, a.household, day, true);
  const hello = word("today_hello", {
    day: dayWords(day, "en", { weekday: "long" }),
  });
  const plans = (await h.records(a.household, "plans")).filter(live);
  const notMade = new Set(
    plans.filter((p) => p.on === day && p.made === "no").map((p) => p.slot),
  );
  const cooked = new Set(
    (await h.records(a.household, "cooked"))
      .filter((c) => live(c) && c.on === day)
      .map((c) => c.dish),
  );
  const lines = (input ? planMeals(input) : []).map((m) => {
    if (m.child) return word("plan_child", { child: m.label, dish: m.dish });
    const state = notMade.has(m.slot)
      ? "today_not_made"
      : cooked.has(m.id)
        ? "today_made"
        : "today_not_yet";
    const meal = word("plan_meal", { Meal: m.label, n: m.n, dish: m.dish });
    return `${meal} ${word(state)}`;
  });
  const said = [hello, ...lines].join("\n");
  const t = cook ? await tomorrowOf(h, a.w.templates, a.household, day) : null;
  if (t)
    await a.answer("cmd_said_recipes", { lines: said, recipes: t.recipes });
  else await a.answer("cmd_said", { lines: said });
  return "today";
}
