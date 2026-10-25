import type { Catalogue } from "./template.js";

// The commands (specs/270), in English: each chat's menu, and what each
// command answers in the chat. Each line of a body is a message of its
// own; a list stays one message.

export const COMMANDS: Catalogue = {
  menu_tomorrow: { kind: "text", body: "Tomorrow's plan" },
  menu_today: { kind: "text", body: "Today's plan" },
  menu_off: { kind: "text", body: "The cook's day off" },
  menu_list: { kind: "text", body: "The shopping list" },
  menu_ranout: { kind: "text", body: "Something ran out" },
  // What a command says, its lines made from the words below.
  cmd_said: { kind: "text", body: "{lines}" },
  cmd_said_recipes: {
    kind: "buttons",
    body: "{lines}",
    buttons: { recipes: "Recipes" },
    links: { recipes: "recipes" },
  },
  cmd_not_planned: {
    kind: "buttons",
    body: "Tomorrow isn't planned yet.",
    buttons: { app: "Open the app" },
    links: { app: "page" },
  },
  cmd_sent_at: { kind: "text", body: "Sent to {cook} at {time}." },
  cmd_seen: { kind: "text", body: "She's seen it ✓" },
  cmd_not_seen: { kind: "text", body: "She hasn't seen it yet." },
  cmd_comes_at_ten: { kind: "text", body: "Tomorrow's plan comes at 10 pm." },
  today_hello: { kind: "text", body: "Here's today, {day}." },
  today_made: { kind: "text", body: "Made ✓" },
  today_not_made: { kind: "text", body: "Not made" },
  today_not_yet: { kind: "text", body: "Not yet" },
  off_which: {
    kind: "buttons",
    body: "Which day is {cook} off?",
    buttons: { tomorrow: "Tomorrow", after: "Day after" },
  },
  off_which_self: {
    kind: "buttons",
    body: "Which day aren't you cooking?",
    buttons: { tomorrow: "Tomorrow", after: "Day after" },
  },
  off_done: {
    kind: "text",
    body: "Got it.\n{Cook} is off on {day}.\nI've told her.",
  },
  off_done_self: { kind: "text", body: "Got it.\nNo cooking on {day}." },
  cook_off_day: {
    kind: "text",
    body: "No cooking on {day}.\nEnjoy the day off.",
  },
  list_to_buy: {
    kind: "buttons",
    body: "To buy: {items}.",
    buttons: { open: "Open the list" },
    links: { open: "page" },
  },
  list_empty: {
    kind: "buttons",
    body: "Nothing to buy.",
    buttons: { open: "Open the list" },
    links: { open: "page" },
  },
  ranout_told: {
    kind: "text",
    body: "{Cook} says {food} ran out.\nIt's on the list.",
  },
  cmd_unknown: {
    kind: "text",
    body: "I don't know that one.\nType / to see what I can do.",
  },
  cmd_switched_off: { kind: "text", body: "I'm switched off for now." },
};
