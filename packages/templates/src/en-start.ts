import type { Catalogue } from "./template.js";

// Starting in Telegram (specs/260), in English: Start with no code opens the
// app's setup inside the chat, or the app again once there's a household;
// a household that starts is told when the bot will write.

export const START: Catalogue = {
  welcome: {
    kind: "buttons",
    body: "Hello! I help your family plan its meals, and send them to your cook. Setting up takes a minute.",
    buttons: { setup: "Set up your kitchen" },
    links: { setup: "page" },
  },
  welcome_back: {
    kind: "buttons",
    body: "You're set up.",
    buttons: { open: "Open cookto.day" },
    links: { open: "page" },
  },
  set_up: {
    kind: "text",
    body: "Your kitchen is set up.\nEach night at 10 I'll send you tomorrow's plan to check.",
  },
};
