import { workflow } from "./workflow.js";

// Starting in Telegram (specs/260): a household that starts tells its
// planners, on Telegram, when the bot will write to them.

export const SET_UP = workflow("set_up", {
  first: "said",
  steps: { said: { sends: "set_up", then: "end" } },
});
