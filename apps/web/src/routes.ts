import { useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { settings } from "./platform.js";

// Where the app is, in the address's hash, so the browser's back button
// goes to the step before (specs/65-onboarding.md). Until onboarding is done,
// home is its first step.

export type Step = "where" | "who" | "done";
export type Route = "home" | Step;

const STEPS: Partial<Record<string, Step>> = {
  "#/start/where": "where",
  "#/start/who": "who",
  "#/start/done": "done",
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
  return STEPS[at] ?? (onboarded ? "home" : "where");
}

/** To a step, as a new entry in the browser's history. */
export function go(step: Step): void {
  location.hash = `#/start/${step}`;
}

/** Home, in place of the step that led there. */
export function goHome(): void {
  location.replace("#/");
}
