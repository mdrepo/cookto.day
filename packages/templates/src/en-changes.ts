import type { Catalogue } from "./template.js";

// A change after the plan went to the cook (specs/270), in English: only
// what changed, to the cook with "Got it"; the planners hear it went and
// whether she saw it; close to the meal, they say first. Each line of a
// body is a message of its own.

export const CHANGES: Catalogue = {
  plan_change: {
    kind: "buttons",
    body: "{opening}\n{changes}",
    buttons: { got: "Got it", recipes: "Recipes" },
    links: { recipes: "recipes" },
  },
  change_tomorrow: { kind: "text", body: "A change for tomorrow, {day}." },
  change_today: { kind: "text", body: "A change for today." },
  change_dish: { kind: "text", body: "{Meal} is {dish}, not {was}." },
  change_child: { kind: "text", body: "For {child}: {dish}, not {was}." },
  change_count: { kind: "text", body: "{Meal} is for {n} now." },
  change_gone: { kind: "text", body: "No {meal} {when}." },
  change_back: { kind: "text", body: "{Meal} is back: {dish}." },
  word_today: { kind: "text", body: "today" },
  word_tomorrow: { kind: "text", body: "tomorrow" },
  change_sent: { kind: "text", body: "Sent the change to {cook}." },
  seen_change: { kind: "text", body: "{Cook} saw the change ✓" },
  not_seen_change: {
    kind: "text",
    body: "{Cook} hasn't seen the change yet.",
  },
  change_close: {
    kind: "buttons",
    body: "{Meal} is at {time}.\n{Cook} may have started.\nSend the change anyway?",
    buttons: { send: "Send it", hold: "Don't send" },
  },
};
