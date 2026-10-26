import type { Catalogue } from "./template.js";

// A receipt photo in the chat (specs/277), in English: asked once, what
// was found, added with Undo, each line it isn't sure of, and what stops a
// read. Each line of a body is a message of its own.

const LINE = "Add {name} as it is?";

export const RECEIPTS: Catalogue = {
  menu_receipt: { kind: "text", body: "Add a receipt" },
  receipt_send: { kind: "text", body: "Send me a photo of the bill." },
  receipt_ask: {
    kind: "buttons",
    body: "Before I read it: the photo goes to Google's Gemini to be read.\nGoogle keeps it a short while only to check for abuse, and never trains on it.\ncookto.day keeps only the items.",
    buttons: { read: "Read it", dont: "Don't" },
  },
  receipt_declined: { kind: "text", body: "Okay, I won't read it." },
  receipt_found: {
    kind: "buttons",
    body: "{heading}\n{found}\n{unsure}",
    buttons: { add: "Add {n}", dont: "Don't add" },
  },
  receipt_unsure: { kind: "text", body: "{heading}\n{unsure}" },
  receipt_heading: {
    kind: "text",
    body: "{shop}, {day}: {lines}.",
    plurals: { lines: { one: "{n} line", other: "{n} lines" } },
  },
  receipt_heading_undated: {
    kind: "text",
    body: "{shop}: {lines}.",
    plurals: { lines: { one: "{n} line", other: "{n} lines" } },
  },
  receipt_your: { kind: "text", body: "Your receipt" },
  receipt_yesterday: { kind: "text", body: "yesterday" },
  receipt_found_list: { kind: "text", body: "Found: {items}." },
  receipt_unsure_list: { kind: "text", body: "Not sure: {names}." },
  receipt_check: { kind: "text", body: "(check this line)" },
  receipt_dropped: { kind: "text", body: "Okay, I didn't add it." },
  receipt_added: {
    kind: "buttons",
    body: "Added {n} to the Fridge.\n{unlisted}",
    buttons: { undo: "Undo" },
  },
  receipt_unlisted: { kind: "text", body: "{Foods} is off the list." },
  receipt_unlisted_many: { kind: "text", body: "{Foods} are off the list." },
  receipt_undone: { kind: "text", body: "Taken back." },
  receipt_line: {
    kind: "buttons",
    body: LINE,
    buttons: { asis: "Add as it is", skip: "Skip" },
  },
  receipt_line_foods: {
    kind: "choices",
    body: LINE,
    buttons: {
      f0: "{f0}",
      f1: "{f1}",
      f2: "{f2}",
      asis: "Add as it is",
      skip: "Skip",
    },
  },
  receipt_line_added: { kind: "text", body: "Added {name}." },
  receipt_line_skipped: { kind: "text", body: "Skipped {name}." },
  // What stops a read, in the app's words (specs/129, criterion 13).
  receipt_limit_day: {
    kind: "text",
    body: "You've read {n} receipts today. Try again tomorrow.",
  },
  receipt_limit_month: {
    kind: "text",
    body: "You've read {n} receipts this month.",
  },
  receipt_not_receipt: {
    kind: "text",
    body: "This doesn't look like a receipt.",
  },
  receipt_rejected: {
    kind: "text",
    body: "I couldn't read this photo. Try again tomorrow.",
  },
  receipt_not_working: {
    kind: "text",
    body: "Receipt photos aren't working right now.",
  },
  receipt_file: {
    kind: "text",
    body: "I can read photos of bills for now. Send it as a photo.",
  },
};
