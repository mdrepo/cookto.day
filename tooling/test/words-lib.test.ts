import { describe, expect, test } from "bun:test";
import { wordProblems } from "../scripts/words-lib.js";

// specs/72-kitchen.md criterion 12: no filler in the app's words (ADR 0027).

const banned = ["unlock", "seamless", "oops"];

describe("the words check", () => {
  test("plain words pass", () => {
    expect(
      wordProblems(
        [{ file: "en.ts", key: "emptyTitle", text: "Your kitchen is empty" }],
        banned,
      ),
    ).toEqual([]);
  });

  test("an AI-tell word or an emoji fails, naming the word and the file", () => {
    expect(
      wordProblems(
        [{ file: "en.ts", key: "hero", text: "Unlock your kitchen ✨" }],
        banned,
      ),
    ).toEqual([
      'en.ts hero: "Unlock" is on the banned list (tooling/banned-words.json). Say what happens, plainly.',
      'en.ts hero: an emoji ("✨"). Words only.',
    ]);
  });

  test("matches whole words only, any case", () => {
    expect(
      wordProblems(
        [
          { file: "a", key: "k", text: "Unlocked doors" },
          { file: "a", key: "k2", text: "OOPS" },
        ],
        banned,
      ),
    ).toEqual([
      'a k2: "OOPS" is on the banned list (tooling/banned-words.json). Say what happens, plainly.',
    ]);
  });

  test("digits and symbols like · and ₹ are not emoji", () => {
    expect(
      wordProblems(
        [{ file: "a", key: "k", text: "Spinach · 250 g · ₹40 #1" }],
        banned,
      ),
    ).toEqual([]);
  });
});
