import { useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { settings } from "./platform.js";

// Where the app is, in the address's hash, so the browser's back button
// goes to the step before (specs/65-onboarding.md). Until onboarding is done,
// home is its first step.

export type Step = "where" | "who" | "done";
/** The kitchen's pages (specs/72-kitchen.md). */
export type Page = "cuisines" | "staples" | "pantry" | "dishes";
export type Route = "home" | "settings" | Step | Page;

const STEPS: Partial<Record<string, Step>> = {
  "#/start/where": "where",
  "#/start/who": "who",
  "#/start/done": "done",
};

const PAGES: Partial<Record<string, Page>> = {
  "#/kitchen/cuisines": "cuisines",
  "#/kitchen/staples": "staples",
  "#/kitchen/pantry": "pantry",
  "#/kitchen/dishes": "dishes",
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
  const step = STEPS[at];
  if (step) return step;
  if (!onboarded) return "where";
  if (at === "#/settings") return "settings";
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

/** To Settings, where the language is chosen after setup (#84). */
export function openSettings(): void {
  location.hash = "#/settings";
}

/** Home, in place of the step that led there. */
export function goHome(): void {
  location.replace("#/");
}
