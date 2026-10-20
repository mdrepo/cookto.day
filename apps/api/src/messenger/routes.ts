import { problem } from "../http.js";
import type { MessengerDeps } from "./deps.js";
import { linkStatus, makeLink, unlink } from "./links.js";
import { cancel, send } from "./send.js";
import { webhook } from "./webhook.js";

// The messenger's routes (spec #207), each behind one check: the messenger
// is only there when every secret it needs is saved; until then, 503.

export type Handler = (request: Request, d: MessengerDeps) => Promise<Response>;

export interface MessengerRoute {
  method: "GET" | "POST" | "DELETE";
  /** An exact path, or a prefix with one more segment (a code, an id). */
  path: string;
  segment?: true;
  handler: Handler;
}

export const MESSENGER_ROUTES: MessengerRoute[] = [
  { method: "POST", path: "/api/messenger/links", handler: makeLink },
  {
    method: "GET",
    path: "/api/messenger/links",
    segment: true,
    handler: linkStatus,
  },
  { method: "DELETE", path: "/api/messenger/links", handler: unlink },
  { method: "POST", path: "/api/messenger/send", handler: send },
  {
    method: "DELETE",
    path: "/api/messenger/send",
    segment: true,
    handler: cancel,
  },
  { method: "POST", path: "/api/messenger/telegram", handler: webhook },
];

/** Whether a route's path matches: exact, or exactly one segment more. */
export function matches(r: MessengerRoute, pathname: string): boolean {
  if (r.segment === undefined) return pathname === r.path;
  const rest = pathname.startsWith(`${r.path}/`)
    ? pathname.slice(r.path.length + 1)
    : "";
  return rest !== "" && !rest.includes("/");
}

/** Runs a handler, or says the messenger is off. */
export function withMessenger(
  handler: Handler,
  d: MessengerDeps | null,
  request: Request,
): Promise<Response> {
  if (d === null) return Promise.resolve(problem(503, "off"));
  return handler(request, d);
}
