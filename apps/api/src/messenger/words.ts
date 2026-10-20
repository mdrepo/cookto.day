// What the bot says (spec #207), in English until a native speaker reviews
// other words (ADR 0012, 0031). The plan's own text comes from the app.

export const WORDS = {
  connected:
    "Connected. I'll send you tomorrow's plan each evening. What we send each other is kept for 90 days. Send /stop any time to stop, and it's all deleted.",
  badCode: "That code didn't work. Ask for a new one in the app.",
  stopped: "Stopped and deleted. Nothing more will come from me.",
  cantRead: "I can't read replies yet. Tomorrow's plan comes from the app.",
} as const;
