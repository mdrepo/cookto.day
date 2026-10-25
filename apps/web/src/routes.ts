import { MEAL_SLOTS, type MealSlot } from "@cookto/engine";
import { useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { settings } from "./platform.js";

// Where the app is, in the address's hash, so the browser's back button
// goes to the step before (specs/65-onboarding.md). Until onboarding is done,
// home is its first step.

export type Step = "where" | "who" | "cuisines" | "cooks" | "done";
/** The kitchen's pages (specs/72-kitchen.md). */
export type Page =
  "cuisines" | "staples" | "pantry" | "dishes" | "list" | "more";
/**
 * Where the app is. Setup's "What do you cook?" (specs/263) is the step
 * "cuisines", routed as "what-you-cook", apart from the Cuisines page.
 */
export type Route =
  | "home"
  | "settings"
  | "dish"
  | "pack"
  | "cook"
  | "telegram"
  | SetupRoute
  | Page;
type SetupRoute = Exclude<Step, "cuisines"> | "what-you-cook";

/** The setup step a route shows. */
export const stepOf = (route: SetupRoute): Step =>
  route === "what-you-cook" ? "cuisines" : route;

/** The cook's recipes (specs/241): `#/cook/<day>?d=…`, no kitchen needed. */
const COOK = "#/cook/";

/** A page "Change" opened inside Telegram, until it has signed in. */
const fromTelegram = () =>
  new URLSearchParams(location.search).get("from") === "telegram";

const STEPS: Partial<Record<string, Step>> = {
  "#/start/where": "where",
  "#/start/who": "who",
  "#/start/cuisines": "cuisines",
  "#/start/cooks": "cooks",
  "#/start/done": "done",
};

/** Dishes that use one food (#105): `#/kitchen/dishes/with/<ingredient>`. */
const DISHES_WITH = "#/kitchen/dishes/with/";

/**
 * A dish's page (#95): `#/kitchen/dish/<pack>/<dish>`, and from Today, the
 * meal it's for: `/<slot>`, or `/<slot>/child` for the child's dish (#145).
 */
const DISH = "#/kitchen/dish/";

/** A pack's dishes (specs/175): `#/kitchen/pack/<pack>`. */
const PACK = "#/kitchen/pack/";

/** The Fridge with "Add food" open (#115). */
const ADD_FOOD = "#/kitchen/pantry/add";

/** Settings, with the cook's invite made: setup's last step (specs/260). */
const INVITE_COOK = "#/settings/invite-cook";

const PAGES: Partial<Record<string, Page>> = {
  "#/kitchen/cuisines": "cuisines",
  "#/kitchen/staples": "staples",
  "#/kitchen/pantry": "pantry",
  [ADD_FOOD]: "pantry",
  "#/kitchen/dishes": "dishes",
  "#/kitchen/list": "list",
  "#/kitchen/more": "more",
};

function subscribe(onChange: () => void): () => void {
  addEventListener("hashchange", onChange);
  return () => {
    removeEventListener("hashchange", onChange);
  };
}

const hash = () => location.hash;

export function useRoute(): Route {
  const onboarded = useStore(settings.store, (s) => s.onboarded);
  // The prerender has no address: it draws home, which most visits show.
  const at = useSyncExternalStore(subscribe, hash, () => null);
  if (at === null) return "home";
  if (at.startsWith(COOK)) return "cook";
  if (fromTelegram()) return "telegram";
  const step = STEPS[at];
  if (step) return step === "cuisines" ? "what-you-cook" : step;
  if (!onboarded) return "where";
  if (at === "#/settings" || at === INVITE_COOK) return "settings";
  if (at.startsWith(DISH)) return "dish";
  if (at.startsWith(PACK)) return "pack";
  if (at.startsWith(DISHES_WITH)) return "dishes";
  return PAGES[at] ?? "home";
}

/** To a step, as a new entry in the browser's history. */
export function go(step: Step): void {
  location.hash = `#/start/${step}`;
}

/** To one of the kitchen's pages, as a new entry in the browser's history. */
export function open(page: Page): void {
  location.hash = `#/kitchen/${page}`;
}

/** To the Fridge, with "Add food" open (#115). */
export function openAddFood(): void {
  location.hash = ADD_FOOD;
}

/** Whether the Fridge was opened to add food: read when the Fridge opens. */
export function wantsAddFood(): boolean {
  return typeof location !== "undefined" && location.hash === ADD_FOOD;
}

/** To Settings with the cook's invite, in place of setup's last step. */
export function openInviteCook(): void {
  location.replace(INVITE_COOK);
}

/** Whether Settings was opened to invite the cook; Settings then stays. */
export function wantsInviteCook(): boolean {
  if (typeof location === "undefined" || location.hash !== INVITE_COOK)
    return false;
  history.replaceState(null, "", "#/settings");
  return true;
}

/** To Settings, where the language is chosen after setup (#84). */
export function openSettings(): void {
  location.hash = "#/settings";
}

/** Home, in place of the step that led there. */
export function goHome(): void {
  location.replace("#/");
}

/** To a dish's page (#95), as a new entry in the browser's history. */
export function openDish(
  pack: string,
  dish: string,
  meal?: { slot: MealSlot; child?: boolean },
): void {
  const at = meal ? `/${meal.slot}${meal.child ? "/child" : ""}` : "";
  location.hash = `${DISH}${pack}/${dish}${at}`;
  // A new page starts at its top, not where the list was scrolled to.
  scrollTo(0, 0);
}

/**
 * The dish a dish's page shows: its pack and its id, and the meal it was
 * opened for, if any; or null.
 */
export function useDish(): {
  pack: string;
  dish: string;
  slot?: MealSlot;
  child?: boolean;
} | null {
  const at = useSyncExternalStore(subscribe, hash, () => null);
  const [pack, dish, slot, child] = (
    at?.startsWith(DISH) ? at.slice(DISH.length) : ""
  ).split("/");
  if (!pack || !dish) return null;
  const meal = MEAL_SLOTS.find((s) => s === slot);
  return meal
    ? { pack, dish, slot: meal, child: child === "child" }
    : { pack, dish };
}

/** Back where they came from: the page before, in the browser's history. */
export function goBack(): void {
  history.back();
}

/** To the dishes that use one food (#105). */
export function openDishesWith(ingredient: string): void {
  location.hash = `${DISHES_WITH}${encodeURIComponent(ingredient)}`;
  scrollTo(0, 0);
}

/** The food Dishes is narrowed to, or null for every dish. */
export function useDishesWith(): string | null {
  const at = useSyncExternalStore(subscribe, hash, () => null);
  return at?.startsWith(DISHES_WITH)
    ? decodeURIComponent(at.slice(DISHES_WITH.length))
    : null;
}

/** To a pack's dishes (specs/175). */
export function openPack(pack: string): void {
  location.hash = `${PACK}${pack}`;
  scrollTo(0, 0);
}

/** The pack its page shows, or null. */
export function usePackId(): string | null {
  const at = useSyncExternalStore(subscribe, hash, () => null);
  return at?.startsWith(PACK) ? at.slice(PACK.length) || null : null;
}
