import { workflow } from "./workflow.js";

// The cook's meal checks (specs/242). An hour after each meal she's asked
// if she made it: Yes counts it cooked and takes its amounts from the
// pantry; No asks why, and "Ran out of something" asks what. What she
// leaves unanswered comes together at the end of the day: all, some (each
// asked in turn) or none. The planner hears when a meal wasn't made.

export const MEAL_CHECK = workflow("meal_check", {
  first: "ask",
  steps: {
    ask: { sends: "check_ask", on: { yes: "made", no: "why" } },
    made: { action: "made", sends: "check_thanks", then: "end" },
    why: {
      sends: "check_why",
      on: { other: "other", didnt: "didnt", ran: "ran" },
    },
    other: { action: "madeOther", then: "end" },
    didnt: { action: "didntCook", then: "end" },
    ran: { sends: "check_ran_out", text: "ranOut" },
    ranOut: { action: "ranOut", then: "end" },
  },
});

/** "Some of them": one unanswered meal, then the next. */
export const MEAL_AGAIN = workflow("meal_again", {
  first: "ask",
  steps: {
    ask: { sends: "check_ask", on: { yes: "made", no: "notSaid" } },
    made: { action: "made", then: "end" },
    notSaid: { action: "notSaid", then: "end" },
  },
});

/** The day's unanswered meals, an hour after its last check. */
export const DAY_END = workflow("day_end", {
  first: "ask",
  steps: {
    ask: {
      sends: "day_end_ask",
      on: { all: "all", some: "some", none: "none" },
    },
    all: { action: "madeAll", sends: "check_thanks", then: "end" },
    some: { action: "eachInTurn", then: "end" },
    none: { action: "noneMade", then: "end" },
  },
});

/** To the planners: a meal that wasn't made, and why. */
export const NOT_MADE = workflow("not_made", {
  first: "said",
  steps: { said: { sends: "check_not_made", then: "end" } },
});

/** To the cook: what went on the shopping list. */
export const CHECK_ADDED = workflow("check_added", {
  first: "said",
  steps: { said: { sends: "check_added", then: "end" } },
});
