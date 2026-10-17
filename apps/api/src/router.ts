import { json, problem } from "./http.js";
import { type ReadDeps, readReceipt } from "./receipts/read.js";

// Every request under /api/ (ADR 0025): each path takes one method, and
// anything else is 404 or 405, in JSON like every other answer.

export type Deps = ReadDeps;

interface Route {
  method: "GET" | "POST";
  answer: (request: Request, deps: Deps) => Promise<Response>;
}

const ROUTES = new Map<string, Route>([
  [
    "/api/health",
    { method: "GET", answer: () => Promise.resolve(json(200, { ok: true })) },
  ],
  ["/api/receipts/read", { method: "POST", answer: readReceipt }],
]);

export function route(request: Request, deps: Deps): Promise<Response> {
  const found = ROUTES.get(new URL(request.url).pathname);
  if (found === undefined) return Promise.resolve(problem(404, "not-found"));
  if (request.method !== found.method)
    return Promise.resolve(problem(405, "method", {}, { allow: found.method }));
  return found.answer(request, deps);
}
