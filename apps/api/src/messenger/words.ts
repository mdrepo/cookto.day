import type { Message } from "@cookto/messenger";
import { EN, render } from "@cookto/templates";
import { CHANGE } from "../household/tomorrow-plan.js";

// What the bot says (spec #207), from its templates now (ADR 0034, specs/234),
// word for word, in English until a native speaker reviews other words (ADR
// 0012, 0031). The plan's own text comes from the app.

const say = (id: string) => render({ en: EN }, "en", id).text;

export const WORDS = {
  connected: say("connected"),
  badCode: say("bad_code"),
  signedIn: say("signed_in"),
  joined: say("joined"),
  removed: say("removed"),
  stopped: say("stopped"),
  cantRead: say("cant_read"),
} as const;

/**
 * A reply whose one button opens the app inside the chat, signing in there
 * (specs/260): "Set up your kitchen", or "Open cookto.day" again.
 */
export function withApp(id: "welcome" | "welcome_back"): Message {
  const r = render({ en: EN }, "en", id, { page: CHANGE });
  return {
    kind: "buttons",
    text: r.text,
    buttons: [r.buttons.map((b) => ({ label: b.label, app: CHANGE }))],
  };
}
