import { EN, render } from "@cookto/templates";

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
