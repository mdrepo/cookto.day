import { createChanges, createPlans } from "@cookto/data";
import type { MealSlot } from "@cookto/engine";
import { render } from "@cookto/templates";
import { swapTomorrow } from "@cookto/usecases";
import { ideasFor } from "../household/ideas.js";
import { householdStore } from "../household/record-store.js";
import { plannedOn, live } from "../household/tomorrow-plan.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import { planChanged } from "./changes.js";
import type { Action } from "./deps.js";

// "Change" in the chat (specs/270): the day's meals as buttons, a meal's
// three next ideas, and the one picked swapped in the household's records,
// as a phone's swap is (ADR 0033). The words go to the step's messages.

const IDEA_KEYS = ["a", "b", "c"] as const;

/** "lunch" from the button key "lunch", "morning-snack" from "morning_snack". */
const slotOf = (key: string) => key.replace("_", "-") as MealSlot;

const dayOf = (run: { about: Record<string, unknown> }) =>
  String(run.about.date);

const word = (d: MessengerDeps, id: string) =>
  d.workflows ? render(d.workflows.templates, "en", id).text : id;

const ideas = (
  d: MessengerDeps,
  household: string,
  day: string,
  slot: MealSlot,
) => ideasFor(d.households, household, day, slot, () => iso(d.now()), d.packs);

export const CHANGE_MEAL_ACTIONS: Record<string, Action> = {
  /** The day's planned meals, as buttons. */
  mealsToChange: async ({ run, d }) => {
    const rows = (await d.households.records(run.household, "plans")).filter(
      live,
    );
    const slots = [...new Set(plannedOn(rows, dayOf(run)).map((p) => p.slot))];
    return { buttons: slots.map((s) => s.replace("-", "_")) };
  },
  /** The meal's three next ideas, as buttons. */
  ideasFor: async ({ run, input, d }) => {
    const slot = slotOf(input.kind === "button" ? input.key : "");
    const found = await ideas(d, run.household, dayOf(run), slot);
    const named: Record<string, string> = {};
    found.ideas.forEach((x, i) => {
      const k = IDEA_KEYS[i];
      if (k) named[k] = x.name;
    });
    return {
      dish: found.current?.name ?? word(d, `meal_${slot.replace("-", "_")}`),
      ...named,
      buttons: IDEA_KEYS.slice(0, found.ideas.length),
    };
  },
  /** The idea picked is the meal's dish now. */
  swapIdea: async ({ run, input, d }) => {
    const slot = slotOf(run.step?.replace("ideas_", "") ?? "");
    const day = dayOf(run);
    const found = await ideas(d, run.household, day, slot);
    const key = input.kind === "button" ? input.key : "";
    const picked = found.ideas[IDEA_KEYS.indexOf(key as "a")];
    if (!picked) return {};
    const now = () => iso(d.now());
    const store = householdStore(d.households, run.household, now);
    const plans = createPlans(store, { changes: createChanges(), now });
    await swapTomorrow({ plans }, day, slot, picked.id);
    // Already with the cook? Then she hears of it (specs/270).
    await planChanged(d, run.household);
    return {
      Meal: word(d, `meal_${slot.replace("-", "_")}`),
      dish: picked.name,
    };
  },
};
