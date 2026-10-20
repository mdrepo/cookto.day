import { json, problem } from "../http.js";
import {
  bearer,
  iso,
  lastSegment,
  type MessengerDeps,
  sha256,
} from "./deps.js";

// Sending (spec #207): the phone posts text for its cook, now or at a time,
// and can cancel one still waiting. Text only, 2,000 characters, 20 a day.

export const MAX_TEXT = 2_000;

interface SendBody {
  text: string;
  at?: string;
  context?: unknown;
}

/** The body, checked; a short code says what's wrong. */
async function sendBody(
  request: Request,
): Promise<
  { ok: true; body: SendBody } | { ok: false; error: string; status: number }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, error: "json" };
  }
  if (typeof raw !== "object" || raw === null)
    return { ok: false, status: 400, error: "json" };
  const b = raw as Record<string, unknown>;
  if (typeof b.text !== "string" || b.text.trim() === "")
    return { ok: false, status: 400, error: "text" };
  if (b.text.length > MAX_TEXT)
    return { ok: false, status: 413, error: "long" };
  if (
    b.at !== undefined &&
    (typeof b.at !== "string" || Number.isNaN(Date.parse(b.at)))
  )
    return { ok: false, status: 400, error: "at" };
  const body: SendBody = { text: b.text };
  if (typeof b.at === "string") body.at = new Date(b.at).toISOString();
  if (b.context !== undefined) body.context = b.context;
  return { ok: true, body };
}

/** POST /api/messenger/send */
export async function send(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const token = bearer(request);
  if (token === null) return problem(401, "token");
  const checked = await sendBody(request);
  if (!checked.ok) return problem(checked.status, checked.error);
  const allowed = await d.links.sendAllowed(await sha256(token), iso(d.now()));
  if (!allowed.ok)
    return allowed.reason === "gone"
      ? problem(404, "gone")
      : problem(429, "limit");
  const { text, at, context } = checked.body;
  const id = await d.messenger.send(
    allowed.conversation,
    { kind: "text", text },
    {
      ...(at !== undefined && { at }),
      ...(context !== undefined && { context, replaces: true }),
    },
  );
  d.after(d.messenger.drain());
  return json(202, { id });
}

/** DELETE /api/messenger/send/{id}: a message still waiting is cancelled. */
export async function cancel(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const token = bearer(request);
  if (token === null) return problem(401, "token");
  const state = await d.links.status(await sha256(token), iso(d.now()));
  if (state.state !== "connected") return problem(404, "gone");
  const row = await d.messenger.store.message(lastSegment(request));
  if (row === null || row.conversation !== state.conversation.id)
    return problem(404, "not-found");
  const cancelled = await d.messenger.store.advance(row.id, "cancelled");
  if (!cancelled) return problem(409, "sent");
  await d.messenger.store.dequeue(row.id);
  return new Response(null, { status: 204 });
}
