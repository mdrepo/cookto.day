import { json, problem } from "../http.js";
import { addressKey } from "../usage/address.js";
import { bearer, iso, type MessengerDeps, sha256 } from "./deps.js";

// The links (spec #207): a phone asks for a code, polls until the cook has
// sent it to the bot, and can disconnect. Every answer is states and ids,
// never the token after it was handed out.

/** POST /api/messenger/links */
export async function makeLink(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const made = await d.links.make(
    await addressKey(d.addressSecret, address),
    iso(d.now()),
  );
  if (!made.ok) return problem(429, "limit");
  return json(201, {
    code: made.code,
    token: made.token,
    expiresAt: made.expiresAt,
  });
}

/** GET /api/messenger/links/{code} */
export async function linkStatus(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const token = bearer(request);
  if (token === null) return problem(401, "token");
  const state = await d.links.status(await sha256(token), iso(d.now()));
  return json(200, { state: state.state });
}

/** DELETE /api/messenger/links */
export async function unlink(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const token = bearer(request);
  if (token === null) return problem(401, "token");
  const gone = await d.links.remove(await sha256(token));
  return gone ? new Response(null, { status: 204 }) : problem(404, "gone");
}
