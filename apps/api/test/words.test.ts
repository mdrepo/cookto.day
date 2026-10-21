import { describe, expect, test } from "bun:test";
import { EN, render } from "@cookto/templates";
import { WORDS } from "../src/messenger/words.js";

// specs/234, criterion 11: today's replies (specs #207, #216, #217) are
// templates now, word for word; the routes send them from the templates,
// and every existing test of those routes passes untouched.

describe("today's replies, as templates", () => {
  test("each reply is its template's words, unchanged", () => {
    const ids: Record<keyof typeof WORDS, string> = {
      connected: "connected",
      badCode: "bad_code",
      signedIn: "signed_in",
      joined: "joined",
      removed: "removed",
      stopped: "stopped",
      cantRead: "cant_read",
    };
    for (const [key, id] of Object.entries(ids))
      expect(render({ en: EN }, "en", id).text).toBe(
        WORDS[key as keyof typeof WORDS],
      );
    expect(WORDS.cantRead).toBe(
      "I can't read replies yet. Tomorrow's plan comes from the app.",
    );
    expect(render({ en: EN }, "en", "done_already").text).toBe(
      "That's done already.",
    );
  });
});
