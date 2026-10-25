import type { Catalogue } from "./template.js";

// Tomorrow's plan in Telegram (specs/241), in English: the planner's 10 pm
// question, the cook's plan with her recipes, and the plan's own lines.
// "Change" and "Recipes" open a page of cookto.day inside the chat.

export const TOMORROW: Catalogue = {
  tomorrow_ask: {
    kind: "buttons",
    body: "Tomorrow, {day}:\n{plan}",
    buttons: { good: "Looks good", change: "Change", none: "No cooking" },
    links: { change: "change" },
  },
  tomorrow_ask_off: {
    kind: "buttons",
    body: "The cook is off tomorrow.\nTomorrow, {day}:\n{plan}",
    buttons: { good: "Looks good", change: "Change" },
    links: { change: "change" },
  },
  tomorrow_sent: { kind: "text", body: "Sent to the cook." },
  tomorrow_sent_silent: { kind: "text", body: "Sent to the cook as planned." },
  no_cooking_ask: {
    kind: "buttons",
    body: "No cooking tomorrow? The cook will be told.",
    buttons: { yes: "Yes, tell her", back: "Back" },
  },
  to_cook_plan: {
    kind: "buttons",
    body: "Tomorrow, {day}:\n{plan}",
    buttons: { recipes: "Recipes" },
    links: { recipes: "recipes" },
  },
  to_cook_off: {
    kind: "text",
    body: "No cooking tomorrow, {day}. Enjoy the day off.",
  },
  // The plan's lines, as "Share tomorrow" writes them (specs/195).
  plan_child: { kind: "text", body: "For the child: {dish}" },
  meal_breakfast: { kind: "text", body: "Breakfast" },
  meal_morning_snack: { kind: "text", body: "Morning snack" },
  meal_lunch: { kind: "text", body: "Lunch" },
  meal_evening_snack: { kind: "text", body: "Evening snack" },
  meal_dinner: { kind: "text", body: "Dinner" },
};
