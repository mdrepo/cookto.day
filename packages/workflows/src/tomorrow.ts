import { workflow } from "./workflow.js";

// Tomorrow's plan in Telegram (specs/241, specs/270). At 10 pm the planners
// are asked: "Send it" sorts it and sends it to the cook; "Change" opens the
// app inside Telegram (a page, so no step of its own); "No cooking" asks
// once more, then makes tomorrow a day off and tells her. Silence is yes at
// 11 pm. On her day off there's nothing to send her, and no "No cooking".
// When the planners cook, there's nobody to hand it to: "Looks good" sorts
// it. The cook's "Got it" goes back to the planners; no "Got it" by an hour
// before the day's first meal, and they hear she hasn't seen it.

export const TOMORROW = workflow("tomorrow", {
  first: "ask",
  steps: {
    ask: { sends: "tomorrow_ask", on: { send: "sent", none: "noCooking" } },
    noCooking: { sends: "no_cooking_ask", on: { yes: "off", back: "ask" } },
    sent: { action: "sendToCook", sends: "tomorrow_sent", then: "end" },
    off: { action: "noCooking", then: "end" },
  },
  onExpire: "sendAsPlanned",
});

export const TOMORROW_OFF = workflow("tomorrow_off", {
  first: "ask",
  steps: {
    ask: { sends: "tomorrow_ask_off", on: { good: "sorted" } },
    sorted: { action: "sorted", then: "end" },
  },
});

/** The planners cook (specs/270): sorted, or a day without cooking. */
export const TOMORROW_SELF = workflow("tomorrow_self", {
  first: "ask",
  steps: {
    ask: { sends: "tomorrow_ask_self", on: { good: "sorted", none: "off" } },
    sorted: { action: "sorted", sends: "tomorrow_sorted", then: "end" },
    off: { action: "dayOff", sends: "tomorrow_self_off", then: "end" },
  },
  onExpire: "sorted",
});

/** The cook's plan, with her recipes and "Got it". */
export const TO_COOK = workflow("to_cook", {
  first: "plan",
  steps: {
    plan: { sends: "to_cook_plan", on: { got: "seen" } },
    seen: { action: "seen", sends: "to_cook_thanks", then: "end" },
  },
  onExpire: "notSeen",
});

/** "No cooking tomorrow": the cook is told. */
export const TO_COOK_OFF = workflow("to_cook_off", {
  first: "off",
  steps: { off: { sends: "to_cook_off", then: "end" } },
});

/** Nobody answered by 11 pm: the planners hear it went as planned. */
export const SENT_AS_PLANNED = workflow("sent_as_planned", {
  first: "said",
  steps: { said: { sends: "tomorrow_sent_silent", then: "end" } },
});

/** The cook saw tomorrow's plan, or hasn't yet: the planners hear it. */
export const SEEN_PLAN = workflow("seen_plan", {
  first: "said",
  steps: { said: { sends: "seen_plan", then: "end" } },
});

export const NOT_SEEN_PLAN = workflow("not_seen_plan", {
  first: "said",
  steps: { said: { sends: "not_seen_plan", then: "end" } },
});
