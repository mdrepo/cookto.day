import type { Role } from "@cookto/db";
import { accountOf } from "../auth/session.js";
import { json, problem } from "../http.js";
import {
  iso,
  lastSegment,
  type MessengerDeps,
  sha256,
} from "../messenger/deps.js";
import { setMenus } from "../messenger/menus.js";
import type { MessengerRoute } from "../messenger/routes.js";
import { WORDS } from "../messenger/words.js";
import { addressKey } from "../usage/address.js";
import { setUp } from "../workflows/start.js";
import { readRecords } from "./sync.js";

// The household (spec #217, ADR 0033): made from a phone's records when it
// signs in, and its planners on Telegram told it's set up (specs/260); its
// members; invites by role; remove a member; delete the
// account. Every route takes the session; who may do what is the
// database's check, membership by membership.

const ROLES: Role[] = ["plan", "cook"];

/** POST /api/household: records, and the cook's token this phone held. */
export async function createHousehold(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  const body = await readRecords(request);
  if (!body.ok) return problem(body.status, body.error);
  const now = iso(d.now());
  const made = await d.households.create(who.account, body.records, now);
  if (!made.ok) return problem(409, made.reason);
  if (body.cookToken !== undefined)
    await d.households.claimCook(
      who.account,
      await sha256(body.cookToken),
      now,
    );
  await setUp(d, made.household);
  // Its chats' menus (specs/270).
  await setMenus(d, made.household);
  return json(201, { id: made.household });
}

/** GET /api/household */
export async function getHousehold(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  const view = await d.households.get(who.account);
  return view === null ? problem(404, "no-household") : json(200, view);
}

/** POST /api/household/links: an invite with a role; the code to share. */
export async function invite(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  const body = (await request.json().catch(() => null)) as {
    role?: unknown;
  } | null;
  const role = ROLES.find((r) => r === body?.role);
  if (role === undefined) return problem(400, "role");
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const made = await d.households.invite(
    who.account,
    role,
    await addressKey(d.addressSecret, address),
    iso(d.now()),
  );
  if (!made.ok)
    return made.reason === "limit"
      ? problem(429, "limit")
      : problem(403, "no-household");
  return json(201, { code: made.code, expiresAt: made.expiresAt });
}

/** DELETE /api/household/members/{id}: the cook hears goodbye first. */
export async function removeMember(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  const id = lastSegment(request);
  const view = await d.households.get(who.account);
  const member = view?.members.find((m) => m.id === id);
  if (view === null || member === undefined) return problem(404, "not-found");
  const removed = await d.households.removeMember(who.account, id);
  if (!removed.ok) return problem(404, "not-found");
  if (removed.chat !== null && member.kind === "telegram")
    await d.messenger.channel
      .deliver(removed.chat, { kind: "text", text: WORDS.removed })
      .catch(() => undefined);
  return new Response(null, { status: 204 });
}

/** DELETE /api/account */
export async function deleteAccount(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const who = await accountOf(request, d);
  if (who === null) return problem(401, "session");
  await d.households.deleteAccount(who.account);
  return new Response(null, { status: 204 });
}

export const HOUSEHOLD_ROUTES: MessengerRoute[] = [
  { method: "POST", path: "/api/household", handler: createHousehold },
  { method: "GET", path: "/api/household", handler: getHousehold },
  { method: "POST", path: "/api/household/links", handler: invite },
  {
    method: "DELETE",
    path: "/api/household/members",
    segment: true,
    handler: removeMember,
  },
  { method: "DELETE", path: "/api/account", handler: deleteAccount },
];
