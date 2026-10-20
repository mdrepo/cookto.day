import { AUTH_ROUTES } from "./auth/routes.js";
import { json, problem } from "./http.js";
import type { KeysReport } from "./keys.js";
import type { MessengerDeps } from "./messenger/deps.js";
import {
  matches,
  MESSENGER_ROUTES,
  withMessenger,
} from "./messenger/routes.js";
import { type ReadDeps, readReceipt } from "./receipts/read.js";

// Every request under /api/ (ADR 0025): a path takes its methods, and
// anything else is 404 or 405, in JSON like every other answer.

export interface Deps extends ReadDeps {
  /** Whether each saved key works (#202, keys.ts). */
  keys: () => Promise<KeysReport>;
  /** The messenger (#207), or null until its secrets are saved. */
  messenger: MessengerDeps | null;
}

interface Route {
  method: string;
  matches: (pathname: string) => boolean;
  answer: (request: Request, deps: Deps) => Promise<Response>;
}

const exact = (path: string) => (pathname: string) => pathname === path;

const ROUTES: Route[] = [
  {
    method: "GET",
    matches: exact("/api/health"),
    answer: () => Promise.resolve(json(200, { ok: true })),
  },
  {
    method: "GET",
    matches: exact("/api/health/keys"),
    answer: async (_, deps) => json(200, await deps.keys()),
  },
  {
    method: "POST",
    matches: exact("/api/receipts/read"),
    answer: readReceipt,
  },
  ...[...MESSENGER_ROUTES, ...AUTH_ROUTES].map((r) => ({
    method: r.method,
    matches: (pathname: string) => matches(r, pathname),
    answer: (request: Request, deps: Deps) =>
      withMessenger(r.handler, deps.messenger, request),
  })),
];

export function route(request: Request, deps: Deps): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const here = ROUTES.filter((r) => r.matches(pathname));
  if (here.length === 0) return Promise.resolve(problem(404, "not-found"));
  const found = here.find((r) => r.method === request.method);
  if (found === undefined)
    return Promise.resolve(
      problem(
        405,
        "method",
        {},
        { allow: here.map((r) => r.method).join(", ") },
      ),
    );
  return found.answer(request, deps);
}
