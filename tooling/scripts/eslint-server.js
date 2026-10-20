import { RAW_HTML } from "./eslint-syntax.js";

// ADR 0025, 0028: the API is server code, so the browser's storage rules
// (ADR 0024) don't fit it. It reaches the network only from its AI adapter,
// and logs only through its log helper, so nothing a person sends can leave
// in a request or a log line by accident.
//
// A file gets one setting per rule (a later block replaces an earlier one),
// so each block lists every ban for the files it matches.

const ADAPTER = "apps/api/src/network.ts";
const LOGGER = "apps/api/src/log.ts";

const NETWORK = `The API reaches the network only in ${ADAPTER}, which the adapters receive as an argument (ADR 0028, 0031). Ask a code owner before adding another.`;
const LOG = `The API logs only through ${LOGGER}: its entries hold codes and numbers, never what a person sent (ADR 0028).`;

const NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"];
const CONSOLE = ["log", "info", "warn", "error", "debug", "trace", "dir"];

/**
 * @param {string[]} names
 * @returns {import("eslint").Linter.RuleEntry}
 */
const globals = (names) => [
  "error",
  ...names.map((name) => ({ name, message: NETWORK })),
];

/**
 * @param {boolean} withConsole
 * @returns {import("eslint").Linter.RuleEntry}
 */
const properties = (withConsole) => [
  "error",
  { property: "innerHTML", message: RAW_HTML },
  { property: "outerHTML", message: RAW_HTML },
  { property: "insertAdjacentHTML", message: RAW_HTML },
  ...["globalThis", "self"].flatMap((object) =>
    NETWORK_GLOBALS.map((property) => ({ object, property, message: NETWORK })),
  ),
  ...(withConsole
    ? CONSOLE.map((property) => ({ object: "console", property, message: LOG }))
    : []),
];

/** @type {import("eslint").Linter.Config[]} */
export const server = [
  {
    files: ["apps/api/src/**"],
    rules: {
      "no-console": "off",
      "no-restricted-globals": globals(NETWORK_GLOBALS),
      "no-restricted-properties": properties(true),
    },
  },
  {
    files: [ADAPTER],
    rules: {
      "no-restricted-globals": globals(
        NETWORK_GLOBALS.filter((name) => name !== "fetch"),
      ),
    },
  },
  {
    files: [LOGGER],
    rules: { "no-restricted-properties": properties(false) },
  },
];
