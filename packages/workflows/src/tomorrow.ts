import { workflow } from "./workflow.js";

// Tomorrow's plan in Telegram (specs/241). At 10 pm the planners are asked:
// "Looks good" sorts it and sends it to the cook; "Change" opens the app
// inside Telegram (a page, so no step of its own); "No cooking" asks once
// more, then makes tomorrow a day off and tells her. Silence is yes at
// 11 pm. On her day off there's nothing to send her, and no "No cooking".

export const TOMORROW = workflow("tomorrow", {
  first: "ask",
  steps: {
    ask: { sends: "tomorrow_ask", on: { good: "sent", none: "noCooking" } },
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

/** The cook's plan, with her recipes. */
export const TO_COOK = workflow("to_cook", {
  first: "plan",
  steps: { plan: { sends: "to_cook_plan", then: "end" } },
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
