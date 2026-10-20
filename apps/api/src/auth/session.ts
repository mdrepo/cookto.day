import type { Session } from "@cookto/db";
import { iso, type MessengerDeps, sha256 } from "../messenger/deps.js";
import { sessionToken } from "./cookie.js";

// Who is asking (spec #216, #217): the session cookie, hashed, looked up.
// Null when there is no cookie or the session is gone or 30 days old.

export async function accountOf(
  request: Request,
  d: MessengerDeps,
): Promise<Session | null> {
  const token = sessionToken(request);
  if (token === null) return null;
  return d.auth.session(await sha256(token), iso(d.now()));
}
