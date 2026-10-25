import { workflow } from "./workflow.js";

// A change after the plan went to the cook (specs/270). Each change made
// waits two minutes, so a few quick edits go as one: when its time comes
// and the plan is still as it left it, what changed goes to the cook, or,
// close to the meal, the planners say first. The cook's "Got it" goes back
// to the planners; no "Got it" in 30 minutes, and they hear it.

/** Two minutes after a change: still the plan as it is, it goes. */
export const CHANGE_WAIT = workflow("change_wait", {
  first: "due",
  steps: { due: { action: "changeDue", then: "end" } },
});

/** What changed, to the cook, with her recipes and "Got it". */
export const PLAN_CHANGE = workflow("plan_change", {
  first: "change",
  steps: {
    change: { sends: "plan_change", on: { got: "seen" } },
    seen: { action: "seenChange", sends: "to_cook_thanks", then: "end" },
  },
  onExpire: "notSeenChange",
});

/** The meal starts within the hour: the planners say whether it goes. */
export const CHANGE_CLOSE = workflow("change_close", {
  first: "ask",
  steps: {
    ask: { sends: "change_close", on: { send: "send", hold: "end" } },
    send: { action: "sendChange", then: "end" },
  },
});

/** What went to the cook, kept to compare with: nothing is said. */
export const PLAN_KEPT = workflow("plan_kept", {
  first: "kept",
  steps: { kept: { then: "end" } },
});

/** The planners hear the change went, and whether she saw it. */
export const CHANGE_SENT = workflow("change_sent", {
  first: "said",
  steps: { said: { sends: "change_sent", then: "end" } },
});

export const SEEN_CHANGE = workflow("seen_change", {
  first: "said",
  steps: { said: { sends: "seen_change", then: "end" } },
});

export const NOT_SEEN_CHANGE = workflow("not_seen_change", {
  first: "said",
  steps: { said: { sends: "not_seen_change", then: "end" } },
});
