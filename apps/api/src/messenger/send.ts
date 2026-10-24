import { accountOf } from "../auth/session.js";
import { json, problem } from "../http.js";
import { finish } from "../workflows/engine.js";
import { tomorrowRun } from "../workflows/tomorrow.js";
import {
  bearer,
  iso,
  lastSegment,
  type MessengerDeps,
  sha256,
} from "./deps.js";

// Sending (spec #207): the phone posts text for its cook, now or at a time,
// and can cancel one still waiting. Text only, 2,000 characters, 20 a day.
// Signed in, it goes to every cook of the household (spec #217); a phone
// that never signed in still sends with its link's token.

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

/** The conversations a send goes to, or why not. */
async function recipients(
  request: Request,
  d: MessengerDeps,
): Promise<
  { ok: true; conversations: string[] } | { ok: false; response: Response }
> {
  const no = (status: number, error: string) =>
    ({ ok: false, response: problem(status, error) }) as const;
  const who = await accountOf(request, d);
  if (who !== null) {
    const cooks = await d.households.cooks(who.account, iso(d.now()));
    if (cooks.ok) return cooks;
    if (cooks.reason === "no-household") return no(403, "no-household");
    return cooks.reason === "no-cook" ? no(409, "no-cook") : no(429, "limit");
  }
  const token = bearer(request);
  if (token === null) return no(401, "token");
  const allowed = await d.links.sendAllowed(await sha256(token), iso(d.now()));
  if (!allowed.ok)
    return allowed.reason === "gone" ? no(404, "gone") : no(429, "limit");
  return { ok: true, conversations: [allowed.conversation] };
}

/** POST /api/messenger/send */
export async function send(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const checked = await sendBody(request);
  if (!checked.ok) return problem(checked.status, checked.error);
  const to = await recipients(request, d);
  if (!to.ok) return to.response;
  const { text, at, context } = checked.body;
  const ids: string[] = [];
  for (const conversation of to.conversations)
    ids.push(
      await d.messenger.send(
        conversation,
        { kind: "text", text },
        {
          ...(at !== undefined && { at }),
          ...(context !== undefined && { context, replaces: true }),
        },
      ),
    );
  d.after(d.messenger.drain());
  await answeredInTheApp(request, d, context);
  return json(202, { id: ids[0], ids });
}

/**
 * Tomorrow's plan sent from the app (specs/241): the bot's 10 pm question
 * for that day is answered, so its run ends and nothing goes at 11 pm.
 */
async function answeredInTheApp(
  request: Request,
  d: MessengerDeps,
  context: unknown,
): Promise<void> {
  const day = /^plan:(\d{4}-\d{2}-\d{2})$/.exec(String(context))?.[1];
  const who = day ? await accountOf(request, d) : null;
  const home = who ? await d.households.get(who.account) : null;
  if (day && home) await finish(d, tomorrowRun(home.id, day));
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
