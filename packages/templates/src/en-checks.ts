import type { Catalogue } from "./template.js";

// The cook's meal checks (specs/242), in English: an hour after each meal,
// did she make it; if not, why; what ran out; and the day's unanswered
// meals together. The planner hears when a meal wasn't made.

export const CHECKS: Catalogue = {
  check_ask: {
    kind: "buttons",
    body: "Did you make {meal}?\n{dishes}",
    buttons: { yes: "Yes", no: "No" },
  },
  check_thanks: { kind: "text", body: "Thanks." },
  check_why: {
    kind: "buttons",
    body: "What happened?",
    buttons: {
      other: "Made other food",
      didnt: "Didn't cook it",
      ran: "Ran out of something",
    },
  },
  check_ran_out: { kind: "text", body: "What ran out?\nSend its name." },
  check_added: { kind: "text", body: "Added {foods} to the shopping list." },
  check_not_made: { kind: "text", body: "{Meal} wasn't made: {reason}." },
  day_end_ask: {
    kind: "buttons",
    body: "Not answered today: {meals}.",
    buttons: {
      all: "Made them all",
      some: "Some of them",
      none: "None of them",
    },
  },
};
