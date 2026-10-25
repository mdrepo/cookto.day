import type { PushedRecord } from "@cookto/db";
import { accountOf } from "../auth/session.js";
import { json, problem } from "../http.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import type { MessengerRoute } from "../messenger/routes.js";
import { planChanged } from "../workflows/changes.js";

// Sync (spec #217, ADR 0033): a phone pushes the records it changed, whole,
// and the newer version wins; it pulls the changes after its cursor, a page
// at a time. Logs hold counts, never a record.

/** At most this many records a push, and changes a page. */
export const PAGE = 500;

type Body =
  | { ok: true; records: PushedRecord[]; cookToken?: string }
  | { ok: false; status: number; error: string };

function isRecord(r: unknown): r is PushedRecord {
  if (typeof r !== "object" || r === null) return false;
  const { collection, record } = r as Record<string, unknown>;
  if (typeof collection !== "string") return false;
  if (typeof record !== "object" || record === null) return false;
  const { id, version } = record as Record<string, unknown>;
  return typeof id === "string" && typeof version === "number";
}

/** The body of a push, or of making a household: records, checked. */
export async function readRecords(request: Request): Promise<Body> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, error: "json" };
  }
  if (typeof raw !== "object" || raw === null)
    return { ok: false, status: 400, error: "json" };
  const b = raw as { records?: unknown; cookToken?: unknown };
  if (!Array.isArray(b.records) || !b.records.every(isRecord))
    return { ok: false, status: 400, error: "records" };
  if (b.records.length > PAGE) return { ok: false, status: 413, error: "many" };
  return {
    ok: true,
    records: b.records,
    ...(typeof b.cookToken === "string" && { cookToken: b.cookToken }),
  };
}

/** POST /api/sync/push */
export async function push(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  const body = await readRecords(request);
  if (!body.ok) return problem(body.status, body.error);
  const pushed = await d.households.push(
    who.account,
    body.records,
    iso(started),
  );
  if (!pushed.ok) return problem(403, pushed.reason);
  // A day already sent to the cook may have changed (specs/270).
  const home = d.workflows ? await d.households.get(who.account) : null;
  if (home) await planChanged(d, home.id);
  d.log({
    route: "sync/push",
    status: 200,
    ms: d.now() - started,
    sent: body.records.length,
    failed: pushed.refused.length,
  });
  return json(200, { refused: pushed.refused });
}

/** GET /api/sync/changes?after={cursor} */
export async function pull(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  const after = Number(new URL(request.url).searchParams.get("after") ?? "");
  if (!Number.isInteger(after) || after < 0) return problem(400, "after");
  const page = await d.households.changes(who.account, after, PAGE);
  if (page === null) return problem(403, "no-household");
  d.log({
    route: "sync/changes",
    status: 200,
    ms: d.now() - started,
    sent: page.changes.length,
  });
  return json(200, page);
}

export const SYNC_ROUTES: MessengerRoute[] = [
  { method: "POST", path: "/api/sync/push", handler: push },
  { method: "GET", path: "/api/sync/changes", handler: pull },
];
