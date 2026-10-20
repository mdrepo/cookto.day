import { signInStatus, startSignIn } from "../src/auth/routes.js";
import {
  createHousehold,
  getHousehold,
  invite,
} from "../src/household/routes.js";
import { webhook } from "../src/messenger/webhook.js";
import { cookieValue, withCookie } from "./auth-support.js";
import { record } from "./household-support.js";
import { incoming } from "./messenger-flow.js";
import { ask, type Harness } from "./messenger-support.js";

// The steps every household test starts from (spec #217): a person signed
// in through the bot, a request with their session, a household made from a
// phone's records, and an invite pressed in the bot.

export const MAYUR = { id: "42", name: "Mayur" };
export const PRIYA = { id: "7", name: "Priya" };

export const PLAN = record("plans", "p-1", {
  on: "2026-10-21",
  slot: "dinner",
  dish: "paneer",
});
export const DISH = record("my-dishes", "d-1", { name: "Paneer bhurji" });

/** Signed in through the bot: the session cookie this phone holds. */
export async function signedInAs(
  h: Harness,
  from: { id: string; name: string },
  chat = "c-42",
) {
  const made = (await (
    await startSignIn(ask("POST", "/api/auth/links"), h.deps)
  ).json()) as { code: string; token: string };
  const u = h.channel.update({
    id: `u-${from.id}-${made.code}`,
    chat,
    event: { kind: "started", code: made.code },
    from,
  });
  await webhook(incoming(u), h.deps);
  await h.settle();
  const used = await signInStatus(
    ask("GET", `/api/auth/links/${made.code}`, undefined, made.token),
    h.deps,
  );
  h.channel.deliveries.length = 0;
  return cookieValue(used) ?? "";
}

/** A request carrying a session. */
export const as = (
  session: string,
  method: string,
  path: string,
  body?: unknown,
) => withCookie(ask(method, path, body), session);

/** Mayur signed in, with a household holding the plan and the dish. */
export async function home(h: Harness) {
  const session = await signedInAs(h, MAYUR);
  const made = await createHousehold(
    as(session, "POST", "/api/household", { records: [PLAN, DISH] }),
    h.deps,
  );
  const { id } = (await made.json()) as { id: string };
  return { session, id };
}

/** The household as its API answers it. */
export async function view(h: Harness, session: string) {
  const response = await getHousehold(
    as(session, "GET", "/api/household"),
    h.deps,
  );
  return (await response.json()) as {
    id: string;
    members: {
      id: string;
      role: string;
      kind: string;
      name: string | null;
      stopped: boolean;
    }[];
  };
}

/** An invite with this role, pressed in the bot from `chat` (and `from`). */
export async function joined(
  h: Harness,
  session: string,
  role: "plan" | "cook",
  chat: string,
  from?: { id: string; name: string },
) {
  const made = await invite(
    as(session, "POST", "/api/household/links", { role }),
    h.deps,
  );
  const { code } = (await made.json()) as { code: string };
  const u = h.channel.update({
    id: `u-${role}-${code}`,
    chat,
    event: { kind: "started", code },
    ...(from && { from }),
  });
  await webhook(incoming(u), h.deps);
  await h.settle();
  return code;
}
