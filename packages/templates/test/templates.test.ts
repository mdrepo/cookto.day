import { describe, expect, test } from "bun:test";
import { type Catalogues, checkTemplates, EN, render } from "../src/index.js";

// specs/234, criteria 3 and 4: every word the bot sends is a template, by id
// and language (ADR 0034). A check fails the build when the languages
// disagree or a template breaks WhatsApp's limits; rendering fills the
// slots, with plurals in the language's own forms, and falls back to English.

const ok: Catalogues = {
  en: {
    found: {
      kind: "buttons",
      body: "Found {items} on {day}.",
      plurals: { items: { one: "{n} item", other: "{n} items" } },
      buttons: { add: "Add all", wrong: "Something's wrong" },
    },
    hello: { kind: "text", body: "Hello, {name}." },
  },
  hi: {
    found: {
      kind: "buttons",
      body: "{day} को {items} मिले।",
      plurals: { items: { one: "{n} चीज़", other: "{n} चीज़ें" } },
      buttons: { add: "सब जोड़ें", wrong: "कुछ गलत है" },
    },
  },
};

describe("the template check", () => {
  test("templates that agree, within the limits, pass", () => {
    expect(checkTemplates(ok)).toEqual([]);
  });

  test("slots or button keys that differ between languages fail, naming the template", () => {
    const bad: Catalogues = {
      en: ok.en,
      hi: {
        found: {
          kind: "buttons",
          body: "{items} मिले।",
          buttons: { add: "सब जोड़ें", other: "और" },
        },
      },
    };
    const problems = checkTemplates(bad).join("\n");
    expect(problems).toContain("hi/found: slots differ");
    expect(problems).toContain("hi/found: buttons differ");
  });

  test("a label over 20 characters, a body over 1,024, 4 buttons, 11 choices: each fails", () => {
    const keys = (n: number) =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [`k${String(i)}`, "Fine"]),
      );
    const problems = checkTemplates({
      en: {
        long_label: {
          kind: "buttons",
          body: "Pick one.",
          buttons: { yes: "Yes, I cooked all of it" },
        },
        long_body: { kind: "text", body: "x".repeat(1025) },
        four: { kind: "buttons", body: "Pick.", buttons: keys(4) },
        eleven: { kind: "choices", body: "Pick.", buttons: keys(11) },
        ten: { kind: "choices", body: "Pick.", buttons: keys(10) },
      },
    });
    expect(problems).toEqual([
      "en/long_label: label over 20 characters: yes",
      "en/long_body: body over 1,024 characters",
      "en/four: more than 3 buttons",
      "en/eleven: more than 10 choices",
    ]);
  });

  test("the bot's own templates pass", () => {
    expect(checkTemplates({ en: EN })).toEqual([]);
  });
});

describe("rendering", () => {
  test("the words are the language's, the slots filled, plurals in its forms", () => {
    expect(render(ok, "en", "found", { items: 1, day: "Tuesday" })).toEqual({
      kind: "buttons",
      language: "en",
      text: "Found 1 item on Tuesday.",
      buttons: [
        { key: "add", label: "Add all" },
        { key: "wrong", label: "Something's wrong" },
      ],
    });
    expect(render(ok, "en", "found", { items: 9, day: "Tuesday" }).text).toBe(
      "Found 9 items on Tuesday.",
    );
    expect(
      render(ok, "hi", "found", { items: 9, day: "मंगलवार" }),
    ).toMatchObject({ language: "hi", text: "मंगलवार को 9 चीज़ें मिले।" });
  });

  test("a template missing in a language is sent in English", () => {
    expect(render(ok, "hi", "hello", { name: "Asha" })).toEqual({
      kind: "text",
      language: "en",
      text: "Hello, Asha.",
      buttons: [],
    });
    expect(render(ok, "ta", "hello", { name: "Asha" }).language).toBe("en");
  });

  test("a template that doesn't exist at all is a mistake, not a message", () => {
    expect(() => render(ok, "en", "nope")).toThrow("no-template:nope");
  });
});
