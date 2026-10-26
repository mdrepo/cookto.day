import { type Workflow, workflow } from "./workflow.js";

// A receipt photo in the chat (specs/277): asked once per person, what was
// found with Add and Don't add, Undo, and each line it isn't sure of. What
// follows a tap is a run of its own, so it's said after the reply.

/** A run that says one template's words, then ends. */
const said = (name: string, template: string): Workflow =>
  workflow(name, {
    first: "said",
    steps: { said: { sends: template, then: "end" } },
  });

/** Before the first photo goes to Google: read it, or don't. */
export const RECEIPT_ASK = workflow("receipt_ask", {
  first: "ask",
  steps: {
    ask: { sends: "receipt_ask", on: { read: "read", dont: "dont" } },
    read: { action: "agreeAndRead", then: "end" },
    dont: { sends: "receipt_declined", then: "end" },
  },
});

/** That a member agreed: kept, nothing said. */
export const RECEIPTS_AGREED = workflow("receipts_agreed", {
  first: "kept",
  steps: { kept: { then: "end" } },
});

export const RECEIPT_FOUND = workflow("receipt_found", {
  first: "found",
  steps: {
    found: { sends: "receipt_found", on: { add: "add", dont: "dont" } },
    add: { action: "addReceipt", then: "end" },
    dont: { sends: "receipt_dropped", then: "end" },
  },
});

export const RECEIPT_ADDED = workflow("receipt_added", {
  first: "added",
  steps: {
    added: { sends: "receipt_added", on: { undo: "undo" } },
    undo: { action: "undoReceipt", sends: "receipt_undone", then: "end" },
  },
});

const LINE = {
  added: { action: "answerLine", then: "end" },
  skipped: { action: "answerLine", then: "end" },
};

export const RECEIPT_LINE = workflow("receipt_line", {
  first: "ask",
  steps: {
    ask: { sends: "receipt_line", on: { asis: "added", skip: "skipped" } },
    ...LINE,
  },
});

/** A word that could be several foods: those, as well. */
export const RECEIPT_LINE_FOODS = workflow("receipt_line_foods", {
  first: "ask",
  steps: {
    ask: {
      sends: "receipt_line_foods",
      on: {
        f0: "added",
        f1: "added",
        f2: "added",
        asis: "added",
        skip: "skipped",
      },
    },
    ...LINE,
  },
});

export const RECEIPT_UNSURE = said("receipt_unsure", "receipt_unsure");
export const RECEIPT_LINE_ADDED = said(
  "receipt_line_added",
  "receipt_line_added",
);
export const RECEIPT_LINE_SKIPPED = said(
  "receipt_line_skipped",
  "receipt_line_skipped",
);
