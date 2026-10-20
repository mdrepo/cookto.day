import { describe, expect, test } from "bun:test";
import { EN } from "@cookto/templates";
import { accepts, advance, checkWorkflows, workflow } from "../src/index.js";
import { PING, PING_TEMPLATES } from "./ping.js";

// specs/234, criteria 1 and 2: a workflow is steps in TypeScript (ADR 0034).
// The runner takes where a run is and one event, and says which actions to
// run, which templates to send, and where the run is next; nothing more.
// The build check catches a step's mistakes before anything runs.

const templates = { ...EN, ...PING_TEMPLATES };

describe("a workflow, as a script", () => {
  test("start, the button yes, the text hello: ping_ask, passOn, the end", () => {
    const started = advance(PING, null, { kind: "start" });
    expect(started).toEqual({
      actions: [],
      messages: [{ template: "ping_ask", keys: ["yes", "no"] }],
      step: "ask",
      status: "waiting",
      floor: false,
    });
    const yes = advance(PING, "ask", { kind: "button", key: "yes" });
    expect(yes).toEqual({
      actions: [{ name: "passOn", input: { kind: "button", key: "yes" } }],
      messages: [],
      step: "note",
      status: "waiting",
      floor: true,
    });
    expect(advance(PING, "note", { kind: "text", text: "hello" })).toEqual({
      actions: [],
      messages: [],
      step: "end",
      status: "done",
      floor: false,
    });
  });

  test("the button no ends it; expiry runs its action once", () => {
    expect(advance(PING, "ask", { kind: "button", key: "no" })).toMatchObject({
      step: "end",
      status: "done",
    });
    expect(advance(PING, "note", { kind: "expire" })).toEqual({
      actions: [{ name: "countsAsDone", input: { kind: "expire" } }],
      messages: [],
      step: "note",
      status: "expired",
      floor: false,
    });
  });

  test("what a step doesn't take is refused, and nothing moves", () => {
    expect(advance(PING, "ask", { kind: "text", text: "hi" })).toEqual({
      refused: "not-accepted",
    });
    expect(advance(PING, "note", { kind: "photo", ref: "f-1" })).toEqual({
      refused: "not-accepted",
    });
    expect(advance(PING, "note", { kind: "button", key: "yes" })).toEqual({
      refused: "stale",
    });
    expect(advance(PING, "gone", { kind: "button", key: "yes" })).toEqual({
      refused: "stale",
    });
  });

  test("a step that takes text or a photo holds the floor; one that takes buttons doesn't", () => {
    expect(accepts(PING, "ask")).toEqual({ text: false, photo: false });
    expect(accepts(PING, "note")).toEqual({ text: true, photo: false });
  });
});

describe("the build check", () => {
  test("the test workflow passes", () => {
    expect(checkWorkflows([PING], templates)).toEqual([]);
  });

  test("a missing template, a button its template lacks, a step not defined: each named", () => {
    const broken = workflow("broken", {
      first: "start",
      steps: {
        start: { sends: "nowhere", then: "ask" },
        ask: { sends: "ping_ask", on: { yes: "end", maybe: "later" } },
      },
    });
    expect(checkWorkflows([broken], templates)).toEqual([
      "broken/start: no template nowhere",
      "broken/ask: button maybe not in ping_ask",
      "broken/ask: no step later",
    ]);
    const lost = workflow("lost", { first: "missing", steps: {} });
    expect(checkWorkflows([lost], templates)).toEqual([
      "lost: no first step missing",
    ]);
  });
});
