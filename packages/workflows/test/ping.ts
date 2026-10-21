import type { Catalogue } from "@cookto/templates";
import { workflow } from "../src/index.js";

// test_ping (specs/234): the one workflow the engine ships with, only in
// the tests. A button step, a step that waits for text, and an expiry, so
// every path of the runner, the router and the cron is exercised.

export const PING = workflow("test_ping", {
  first: "ask",
  steps: {
    ask: { sends: "ping_ask", on: { yes: "note", no: "end" } },
    note: { action: "passOn", text: "end" },
  },
  onExpire: "countsAsDone",
});

export const PING_TEMPLATES: Catalogue = {
  ping_ask: {
    kind: "buttons",
    body: "Ping for {day}?",
    buttons: { yes: "Yes", no: "No" },
  },
};
