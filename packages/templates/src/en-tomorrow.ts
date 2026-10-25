import type { Catalogue } from "./template.js";

// Tomorrow's plan in Telegram (specs/241, specs/270), in English: the
// planner's 10 pm question, the cook's plan with her recipes and "Got it",
// and the plan's own lines. Each line of a body is a message of its own,
// one sentence each. "Change" and "Recipes" open a page of cookto.day
// inside the chat.

export const TOMORROW: Catalogue = {
  tomorrow_ask: {
    kind: "buttons",
    body: "{hello}\n{plan}\nShall I send it to {cook}?",
    buttons: { send: "Send it", change: "Change", none: "No cooking" },
  },
  // After a swap in the chat: the question again (specs/270).
  tomorrow_ask_again: {
    kind: "buttons",
    body: "Shall I send it to {cook}?",
    buttons: { send: "Send it", change: "Change", none: "No cooking" },
  },
  tomorrow_ask_off: {
    kind: "buttons",
    body: "{Cook} is off tomorrow, {day}.\n{plan}\nDoes this look right?",
    buttons: { good: "Looks good", change: "Change" },
    links: { change: "change" },
  },
  // The planners cook: nothing to hand over (specs/270).
  tomorrow_ask_self: {
    kind: "choices",
    body: "{hello}\n{plan}\nDoes this look right?",
    buttons: {
      good: "Looks good",
      change: "Change",
      none: "No cooking",
      recipes: "Recipes",
    },
    links: { recipes: "recipes" },
  },
  tomorrow_ask_self_again: {
    kind: "choices",
    body: "Does this look right?",
    buttons: {
      good: "Looks good",
      change: "Change",
      none: "No cooking",
      recipes: "Recipes",
    },
    links: { recipes: "recipes" },
  },
  // "Change" in the chat (specs/270): which meal, then three ideas.
  change_which: {
    kind: "choices",
    body: "Which meal?",
    buttons: {
      breakfast: "Breakfast",
      morning_snack: "Morning snack",
      lunch: "Lunch",
      evening_snack: "Evening snack",
      dinner: "Dinner",
      app: "Open the app",
    },
    links: { app: "change" },
  },
  change_ideas: {
    kind: "choices",
    body: "Instead of {dish}:",
    buttons: { a: "{a}", b: "{b}", c: "{c}", more: "More in the app" },
    links: { more: "change" },
  },
  change_swapped: { kind: "text", body: "{Meal} is {dish} now." },
  tomorrow_sorted: { kind: "text", body: "Tomorrow's sorted." },
  tomorrow_self_off: { kind: "text", body: "Got it.\nNo cooking tomorrow." },
  tomorrow_sent: { kind: "text", body: "Sent to {cook}." },
  tomorrow_sent_silent: { kind: "text", body: "Sent to {cook} as planned." },
  no_cooking_ask: {
    kind: "buttons",
    body: "No cooking tomorrow?\n{Cook} will be told.",
    buttons: { yes: "Yes, tell her", back: "Back" },
  },
  to_cook_plan: {
    kind: "buttons",
    body: "{hello}\n{plan}\nTap Got it once you've seen it.",
    buttons: { got: "Got it", recipes: "Recipes" },
    links: { recipes: "recipes" },
  },
  to_cook_thanks: { kind: "text", body: "Thanks." },
  seen_plan: { kind: "text", body: "{Cook} saw tomorrow's plan ✓" },
  not_seen_plan: {
    kind: "text",
    body: "{Cook} hasn't seen tomorrow's plan yet.",
  },
  to_cook_off: {
    kind: "text",
    body: "No cooking tomorrow, {day}.\nEnjoy the day off.",
  },
  // The plan's lines (specs/270): a greeting, each meal for how many, the
  // child's dish, a reason, and tonight's prep.
  plan_hello: { kind: "text", body: "Hi {name}, here's tomorrow, {day}." },
  plan_hello_plain: { kind: "text", body: "Here's tomorrow, {day}." },
  cook_hello: {
    kind: "text",
    body: "Hi {cook}, here's tomorrow, {day}, from {name}.",
  },
  plan_meal: { kind: "text", body: "{Meal} for {n}: {dish}." },
  plan_reason: {
    kind: "text",
    body: "It uses the {food}, which goes off {day}.",
  },
  plan_child: { kind: "text", body: "For {child}: {dish}." },
  plan_tonight: { kind: "text", body: "Tonight: {prep}." },
  prep_soak: { kind: "text", body: "soak the {what}" },
  prep_marinate: { kind: "text", body: "marinate the {what}" },
  prep_ferment: { kind: "text", body: "ferment the {what}" },
  prep_thaw: { kind: "text", body: "thaw the {what}" },
  the_cook: { kind: "text", body: "the cook" },
  the_child: { kind: "text", body: "the child" },
  the_children: { kind: "text", body: "the children" },
  meal_breakfast: { kind: "text", body: "Breakfast" },
  meal_morning_snack: { kind: "text", body: "Morning snack" },
  meal_lunch: { kind: "text", body: "Lunch" },
  meal_evening_snack: { kind: "text", body: "Evening snack" },
  meal_dinner: { kind: "text", body: "Dinner" },
};
