import { TOMORROW } from "./en-tomorrow.js";
import type { Catalogue } from "./template.js";

// The bot's words in English (ADR 0034): today's replies (specs #207, #216,
// #217), word for word, and the one the engine adds. Other languages come
// when a native speaker reviews them (ADR 0012, 0031).

export const EN: Catalogue = {
  connected: {
    kind: "text",
    body: "Connected. I'll send you tomorrow's plan each evening. What we send each other is kept for 90 days. Send /stop any time to stop, and it's all deleted.",
  },
  bad_code: {
    kind: "text",
    body: "That code didn't work. Ask for a new one in the app.",
  },
  signed_in: { kind: "text", body: "Signed in. Go back to the app." },
  joined: {
    kind: "text",
    body: "You're in. Sign in on your phone to see the plan.",
  },
  removed: {
    kind: "text",
    body: "You've been removed. Nothing more will come from me.",
  },
  stopped: {
    kind: "text",
    body: "Stopped and deleted. Nothing more will come from me.",
  },
  cant_read: {
    kind: "text",
    body: "I can't read replies yet. Tomorrow's plan comes from the app.",
  },
  done_already: { kind: "text", body: "That's done already." },
  ...TOMORROW,
};
