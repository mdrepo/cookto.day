// The app's network adapter (ADR 0024, 0025): our own API, nothing else.
// The one file in the app that may call `fetch` (eslint.config.js). Every
// call has a 15-second limit, and an error is a status and a short code,
// never the body. The first routes are the cook's link (spec #207) and
// sign-in (spec #216); the session is a cookie the browser sends by itself.

/** All of `fetch` the adapter uses. */
export type Send = (url: string, init: RequestInit) => Promise<Response>;

export const TIMEOUT_MS = 15_000;

export interface LinkMade {
  code: string;
  token: string;
  expiresAt: string;
}

export type LinkState = "waiting" | "connected" | "expired" | "gone";

/** The phone's poll while a sign-in code shows (spec #216). */
export type SignInStatus =
  { used: false; state: "waiting" | "expired" } | { used: true; name: string };

export interface SendRequest {
  text: string;
  /** When to send it, ISO; now when left out. */
  at?: string;
  /** Replaces a message still waiting with the same context. */
  context?: unknown;
}

/** The API said no, or couldn't be reached (status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`${String(status)} ${code}`);
    this.name = "ApiError";
  }
}

export interface Api {
  makeLink(): Promise<LinkMade>;
  linkState(token: string, code: string): Promise<LinkState>;
  unlink(token: string): Promise<void>;
  send(token: string, request: SendRequest): Promise<{ id: string }>;
  cancel(token: string, id: string): Promise<void>;
}

/** Sign in with Telegram (spec #216): its own interface, so a fake of the
 * cook's `Api` needn't know it. */
export interface SignInApi {
  /** A sign-in code and the token this phone polls with. */
  startSignIn(): Promise<LinkMade>;
  signInStatus(token: string, code: string): Promise<SignInStatus>;
  /** Who this phone is signed in as; 401 when it isn't. */
  me(): Promise<{ name: string }>;
  signOut(): Promise<void>;
}

export interface ApiOptions {
  /** Where the API is; the page's own origin when left out. */
  base?: string;
  send?: Send;
  timeoutMs?: number;
}

export function createApi(options: ApiOptions = {}): Api & SignInApi {
  const base = options.base ?? "";
  const send: Send = options.send ?? ((url, init) => fetch(url, init));
  const timeout = options.timeoutMs ?? TIMEOUT_MS;

  async function call(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (token !== undefined) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    let response: Response;
    try {
      response = await send(`${base}${path}`, {
        method,
        headers,
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new ApiError(0, "network");
    }
    const text = await response.text();
    const parsed: unknown = text === "" ? null : JSON.parse(text);
    if (!response.ok) {
      const code =
        typeof parsed === "object" && parsed !== null && "error" in parsed
          ? String(parsed.error)
          : "error";
      throw new ApiError(response.status, code);
    }
    return parsed;
  }

  return {
    makeLink: () => call("POST", "/api/messenger/links") as Promise<LinkMade>,
    linkState: async (token, code) =>
      (
        (await call(
          "GET",
          `/api/messenger/links/${encodeURIComponent(code)}`,
          token,
        )) as { state: LinkState }
      ).state,
    unlink: async (token) => {
      await call("DELETE", "/api/messenger/links", token);
    },
    send: (token, request) =>
      call("POST", "/api/messenger/send", token, request) as Promise<{
        id: string;
      }>,
    cancel: async (token, id) => {
      await call(
        "DELETE",
        `/api/messenger/send/${encodeURIComponent(id)}`,
        token,
      );
    },
    startSignIn: () => call("POST", "/api/auth/links") as Promise<LinkMade>,
    signInStatus: (token, code) =>
      call(
        "GET",
        `/api/auth/links/${encodeURIComponent(code)}`,
        token,
      ) as Promise<SignInStatus>,
    me: () => call("GET", "/api/auth/me") as Promise<{ name: string }>,
    signOut: async () => {
      await call("DELETE", "/api/auth/session");
    },
  };
}
