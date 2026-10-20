import { json, problem } from "../http.js";
import { bearer, iso, type MessengerDeps, sha256 } from "../messenger/deps.js";
import type { MessengerRoute } from "../messenger/routes.js";
import { addressKey } from "../usage/address.js";
import { clearedCookie, sessionCookie, sessionToken } from "./cookie.js";

// Sign in with Telegram (spec #216, ADR 0033): the phone asks for a code,
// the person presses Start in the bot (messenger/webhook.ts), and the phone,
// polling with the link's token, gets its session cookie once. Every answer
// is states, a first name and ids: the token and the session leave here
// once each and are kept only as hashes.

function logged(
  d: MessengerDeps,
  route: string,
  started: number,
  response: Response,
): Response {
  const error =
    response.status >= 400 ? { error: String(response.status) } : {};
  d.log({ route, status: response.status, ms: d.now() - started, ...error });
  return response;
}

/** POST /api/auth/links */
export async function startSignIn(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const made = await d.auth.makeLink(
    await addressKey(d.addressSecret, address),
    iso(started),
  );
  const response = made.ok
    ? json(201, {
        code: made.code,
        token: made.token,
        expiresAt: made.expiresAt,
      })
    : problem(429, "limit");
  return logged(d, "auth/links", started, response);
}

/** GET /api/auth/links/{code}: used yet? With the token; the cookie once. */
export async function signInStatus(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const token = bearer(request);
  if (token === null)
    return logged(d, "auth/status", started, problem(401, "token"));
  const claimed = await d.auth.claim(await sha256(token), iso(started));
  const response =
    claimed.state === "gone"
      ? problem(404, "gone")
      : claimed.state === "used"
        ? json(
            200,
            { used: true, name: claimed.name },
            { "set-cookie": sessionCookie(claimed.session) },
          )
        : json(200, { used: false, state: claimed.state });
  return logged(d, "auth/status", started, response);
}

/** GET /api/auth/me */
export async function me(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const token = sessionToken(request);
  const session =
    token === null
      ? null
      : await d.auth.session(await sha256(token), iso(started));
  const response =
    session === null
      ? problem(401, "session")
      : json(200, { name: session.name });
  return logged(d, "auth/me", started, response);
}

/** DELETE /api/auth/session */
export async function signOut(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const token = sessionToken(request);
  if (token !== null) await d.auth.end(await sha256(token));
  const response = new Response(null, {
    status: 204,
    headers: { "set-cookie": clearedCookie(), "cache-control": "no-store" },
  });
  return logged(d, "auth/session", started, response);
}

export const AUTH_ROUTES: MessengerRoute[] = [
  { method: "POST", path: "/api/auth/links", handler: startSignIn },
  {
    method: "GET",
    path: "/api/auth/links",
    segment: true,
    handler: signInStatus,
  },
  { method: "GET", path: "/api/auth/me", handler: me },
  { method: "DELETE", path: "/api/auth/session", handler: signOut },
];
