// The session cookie (spec #216, ADR 0033): set and read only by the API,
// so no script on the page ever sees the token. It's sent only to /api, only
// over HTTPS, and only from our own site.

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 30;

const ATTRIBUTES = "Path=/api; HttpOnly; Secure; SameSite=Strict";

/** The Set-Cookie value that signs this phone in. */
export function sessionCookie(token: string): string {
  const maxAge = String(SESSION_DAYS * 24 * 3600);
  return `${SESSION_COOKIE}=${token}; Max-Age=${maxAge}; ${ATTRIBUTES}`;
}

/** The Set-Cookie value that signs this phone out. */
export function clearedCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;
}

/** The session token the request carries, or null. */
export function sessionToken(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE && rest.length > 0) return rest.join("=");
  }
  return null;
}
