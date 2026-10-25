import { createChanges, createEating } from "@cookto/data";
import type { RunRow } from "@cookto/db";
import { addDays, MEAL_SLOTS, type MealSlot } from "@cookto/engine";
import { render } from "@cookto/templates";
import { householdStore } from "../household/record-store.js";
import { clockOf, schedule } from "../household/schedule.js";
import {
  live,
  peopleOf,
  plannedOn,
  tomorrowOf,
} from "../household/tomorrow-plan.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import { planChanged } from "./changes.js";
import type { Action } from "./deps.js";
import { runId, startRun } from "./tomorrow.js";

// /out and /guests (specs/270): the family as buttons, today or tomorrow,
// the meals still to come; then who's out or the guests are written as a
// phone would, every count follows, and the cook hears once it was sent.

const PEOPLE = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const keyOf = (slot: MealSlot) => slot.replace("-", "_");
const slotOf = (key: string) => key.replace("_", "-") as MealSlot;
const keyIn = (input: Parameters<Action>[0]["input"]) =>
  input.kind === "button" ? input.key : "";

const word = (d: MessengerDeps, id: string, slots = {}) =>
  d.workflows ? render(d.workflows.templates, "en", id, slots).text : id;

/** The next question, as a run of its own, with what's been said so far. */
const next = (
  d: MessengerDeps,
  run: RunRow,
  workflow: string,
  about: Record<string, unknown>,
) =>
  startRun(d, run.household, runId(`${run.id}:${workflow}`), {
    workflow,
    audience: run.audience,
    about: { ...run.about, ...about },
  });

/** Each person's name in the chat: their nickname, or "Adult 2". */
async function family(d: MessengerDeps, household: string) {
  const people = (await peopleOf(d.households, household)).slice(0, 8);
  return people.map((p) => {
    const same = people.filter((m) => m.kind === p.kind);
    const kind = p.kind === "adult" ? "person_adult" : "person_child";
    const label = p.nickname
      ? p.nickname
      : word(d, kind, { n: same.indexOf(p) + 1 });
    return { person: p, label };
  });
}

/** The meals still to come on `day`, of these, in the day's order. */
async function toCome(d: MessengerDeps, run: RunRow, slots: MealSlot[]) {
  const s = await schedule(d.households, run.household);
  const clock = clockOf(s, iso(d.now()));
  const day = String(run.about.date);
  return MEAL_SLOTS.filter(
    (slot) =>
      slots.includes(slot) &&
      (!clock || day > clock.day || s.mealTimes[slot] > clock.time),
  );
}

/** Tomorrow's day, or today's, from the button. */
async function dayOf(d: MessengerDeps, run: RunRow, key: string) {
  const s = await schedule(d.households, run.household);
  const today = clockOf(s, iso(d.now()))?.day ?? iso(d.now()).slice(0, 10);
  const tomorrow = key === "tomorrow";
  return {
    date: tomorrow ? addDays(today, 1) : today,
    when: word(d, tomorrow ? "word_tomorrow" : "word_today"),
  };
}

const eating = (d: MessengerDeps, household: string) => {
  const now = () => iso(d.now());
  const store = householdStore(d.households, household, now);
  return createEating(store, { changes: createChanges(), now }).writer;
};

/** The meal's count now, and its name: "Dinner", 3. */
async function countOf(d: MessengerDeps, run: RunRow, slot: MealSlot) {
  const w = d.workflows;
  const day = String(run.about.date);
  const t =
    w && (await tomorrowOf(d.households, w.templates, run.household, day));
  const n = t?.meals.find((m) => m.slot === slot && !m.child)?.n ?? 0;
  return { Meal: word(d, `meal_${keyOf(slot)}`), n };
}

export const OUT_GUESTS_ACTIONS: Record<string, Action> = {
  peopleToPick: async ({ run, d }) => {
    const people = await family(d, run.household);
    const labels: Record<string, string> = {};
    people.forEach((p, i) => {
      const key = PEOPLE[i];
      if (key) labels[key] = p.label;
    });
    return { ...labels, buttons: PEOPLE.slice(0, people.length) };
  },
  outWho: async ({ run, input, d }) => {
    const picked = (await family(d, run.household))[
      PEOPLE.indexOf(keyIn(input))
    ];
    if (!picked) return;
    await next(d, run, "out_when", {
      person: picked.person.id,
      who: picked.label,
    });
  },
  outWhen: async ({ run, input, d }) =>
    next(d, run, "out_meals", await dayOf(d, run, keyIn(input))),
  personMeals: async ({ run, d }) => {
    const people = await peopleOf(d.households, run.household);
    const person = people.find((p) => p.id === run.about.person);
    const slots = await toCome(d, run, [...(person?.meals ?? [])]);
    return { buttons: [...slots.map(keyOf), "all"] };
  },
  outDone: async ({ run, input, d }) => {
    const key = keyIn(input);
    const people = await peopleOf(d.households, run.household);
    const person = people.find((p) => p.id === run.about.person);
    const all = await toCome(d, run, [...(person?.meals ?? [])]);
    const slots = key === "all" ? all : [slotOf(key)];
    const day = String(run.about.date);
    const writer = eating(d, run.household);
    for (const slot of slots)
      await writer.setOut(day, slot, String(run.about.person), true);
    await planChanged(d, run.household);
    const count = await countOf(d, run, slots[0] ?? "dinner");
    return { ...count, meal: count.Meal.toLocaleLowerCase("en") };
  },
  guestsCount: async ({ run, input, d }) => {
    const n =
      input.kind === "text"
        ? Number.parseInt(input.text, 10)
        : Number(keyIn(input).slice(1));
    if (!Number.isInteger(n) || n < 1 || n > 99) return;
    await next(d, run, "guests_when", { guests: n });
  },
  guestsWhen: async ({ run, input, d }) =>
    next(d, run, "guests_meal", await dayOf(d, run, keyIn(input))),
  dayMeals: async ({ run, d }) => {
    const rows = (await d.households.records(run.household, "plans")).filter(
      live,
    );
    const planned = plannedOn(rows, String(run.about.date)).map((p) => p.slot);
    return { buttons: (await toCome(d, run, planned)).map(keyOf) };
  },
  guestsDone: async ({ run, input, d }) => {
    const slot = slotOf(keyIn(input));
    const day = String(run.about.date);
    await eating(d, run.household).addGuests(
      day,
      slot,
      Number(run.about.guests),
    );
    await planChanged(d, run.household);
    return countOf(d, run, slot);
  },
};
