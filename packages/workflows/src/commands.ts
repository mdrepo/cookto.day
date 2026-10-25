import { type Workflow, workflow } from "./workflow.js";

// The commands (specs/270): what each answers in the chat, to the member
// who sent it. Most say something once; /off asks which day, and /ranout
// waits for what ran out.

/** A run that says one template's words, then ends. */
const said = (name: string, template: string): Workflow =>
  workflow(name, {
    first: "said",
    steps: { said: { sends: template, then: "end" } },
  });

export const CMD_SAID = said("cmd_said", "cmd_said");
export const CMD_SAID_RECIPES = said("cmd_said_recipes", "cmd_said_recipes");
export const CMD_NOT_PLANNED = said("cmd_not_planned", "cmd_not_planned");
export const CMD_LIST = said("cmd_list", "list_to_buy");
export const CMD_LIST_EMPTY = said("cmd_list_empty", "list_empty");
export const COOK_OFF_DAY = said("cook_off_day", "cook_off_day");
export const RANOUT_TOLD = said("ranout_told", "ranout_told");

/** /off: which day, then it's a day off, and the cook is told. */
export const OFF_DAY = workflow("off_day", {
  first: "ask",
  steps: {
    ask: { sends: "off_which", on: { tomorrow: "picked", after: "picked" } },
    picked: { action: "offDay", sends: "off_done", then: "end" },
  },
});

/** /off when the planners cook: a day without cooking. */
export const OFF_DAY_SELF = workflow("off_day_self", {
  first: "ask",
  steps: {
    ask: {
      sends: "off_which_self",
      on: { tomorrow: "picked", after: "picked" },
    },
    picked: { action: "offDay", sends: "off_done_self", then: "end" },
  },
});

/** /ranout: what ran out, on the shopping list. */
export const RANOUT = workflow("ranout", {
  first: "ask",
  steps: {
    ask: { sends: "check_ran_out", text: "got" },
    got: { action: "ranOutSaid", then: "end" },
  },
});
