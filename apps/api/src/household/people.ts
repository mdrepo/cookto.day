import type { Households } from "@cookto/db";
import { type Catalogues, render } from "@cookto/templates";

// Who's in the kitchen, for the bot's words (specs/270): the planner's and
// the cook's first names, and whether a cook is on Telegram. With none, the
// planners cook: nothing is handed over, and the cook's messages are theirs.

export interface Kitchen {
  /** The planner's first name; null when unknown or there are several. */
  planner: string | null;
  /** The cook's first name; null when unknown. */
  cookName: string | null;
  /** A cook on Telegram; without one, the planners cook. */
  hasCook: boolean;
}

export async function kitchenOf(
  households: Households,
  household: string,
): Promise<Kitchen> {
  // Before migration 0011 there's no list of people: as before it, a cook,
  // and no names.
  const people = await households.people(household).catch(() => null);
  if (people === null) return { planner: null, cookName: null, hasCook: true };
  const planners = people.filter((p) => p.role === "plan");
  const cook = people.find((p) => p.role === "cook" && p.conversation !== null);
  return {
    planner: planners.length === 1 ? (planners[0]?.name ?? null) : null,
    cookName: cook?.name ?? null,
    hasCook: cook !== undefined,
  };
}

const capital = (words: string) =>
  words.charAt(0).toLocaleUpperCase("en") + words.slice(1);

/** The cook in a sentence: "Sunita", or "the cook" and "The cook". */
export function cookWords(k: Kitchen, templates: Catalogues) {
  const cook = k.cookName ?? render(templates, "en", "the_cook").text;
  return { cook, Cook: capital(cook) };
}

/** The planners' greeting: "Hi Mayur, here's tomorrow, Thursday." */
export function plannerHello(k: Kitchen, templates: Catalogues, day: string) {
  return k.planner === null
    ? render(templates, "en", "plan_hello_plain", { day }).text
    : render(templates, "en", "plan_hello", { name: k.planner, day }).text;
}

/** The cook's: "Hi Sunita, here's tomorrow, Thursday, from Mayur." */
export function cookHello(k: Kitchen, templates: Catalogues, day: string) {
  return k.planner === null || k.cookName === null
    ? render(templates, "en", "plan_hello_plain", { day }).text
    : render(templates, "en", "cook_hello", {
        cook: k.cookName,
        name: k.planner,
        day,
      }).text;
}
