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

/** To the household's cooks, with the session (spec #217): its own
 * interface, so a fake of the cook's `Api` needn't know it. */
export interface HouseholdSendApi {
  sendThroughHousehold(
    request: SendRequest,
  ): Promise<{ id: string; ids?: string[] }>;
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

/** A record as the phone pushes it: whole, with its version inside (#217). */
export interface PushedRecord {
  collection: string;
  record: { id: string; version: number; [field: string]: unknown };
}

export interface Change {
  seq: number;
  collection: string;
  record: PushedRecord["record"];
}

export interface Pulled {
  changes: Change[];
  cursor: number;
  more: boolean;
  /** The cursor was older than what's kept: these are every record. */
  reset: boolean;
}

export interface MemberRow {
  id: string;
  role: "plan" | "cook";
  kind: "account" | "telegram";
  name: string | null;
  stopped: boolean;
}

export interface HouseholdView {
  id: string;
  members: MemberRow[];
}

/** Sync (spec #217): push what changed, pull what changed elsewhere. */
export interface SyncApi {
  push(records: PushedRecord[]): Promise<{ refused: PushedRecord[] }>;
  changes(after: number): Promise<Pulled>;
}

/** The household (spec #217): made, seen, invited to, left. */
export interface HouseholdApi {
  createHousehold(
    records: PushedRecord[],
    cookToken?: string,
  ): Promise<{ id: string }>;
  household(): Promise<HouseholdView>;
  invite(role: "plan" | "cook"): Promise<{ code: string; expiresAt: string }>;
  removeMember(id: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

/** One call of the API: the method, the path, a bearer, a JSON body. */
type Call = (
  method: string,
  path: string,
  token?: string,
  body?: unknown,
) => Promise<unknown>;

function callerOf(options: ApiOptions): Call {
  const base = options.base ?? "";
  const send: Send = options.send ?? ((url, init) => fetch(url, init));
  const timeout = options.timeoutMs ?? TIMEOUT_MS;
  return async (
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ): Promise<unknown> => {
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
  };
}

const cookApi = (call: Call): Api => ({
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
});

const householdSendApi = (call: Call): HouseholdSendApi => ({
  sendThroughHousehold: (request) =>
    call("POST", "/api/messenger/send", undefined, request) as Promise<{
      id: string;
      ids?: string[];
    }>,
});

const signInApi = (call: Call): SignInApi => ({
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
});

const syncApi = (call: Call): SyncApi => ({
  push: (records) =>
    call("POST", "/api/sync/push", undefined, { records }) as Promise<{
      refused: PushedRecord[];
    }>,
  changes: (after) =>
    call(
      "GET",
      `/api/sync/changes?after=${encodeURIComponent(String(after))}`,
    ) as Promise<Pulled>,
});

const householdApi = (call: Call): HouseholdApi => ({
  createHousehold: (records, cookToken) =>
    call("POST", "/api/household", undefined, {
      records,
      ...(cookToken !== undefined && { cookToken }),
    }) as Promise<{ id: string }>,
  household: () => call("GET", "/api/household") as Promise<HouseholdView>,
  invite: (role) =>
    call("POST", "/api/household/links", undefined, { role }) as Promise<{
      code: string;
      expiresAt: string;
    }>,
  removeMember: async (id) => {
    await call("DELETE", `/api/household/members/${encodeURIComponent(id)}`);
  },
  deleteAccount: async () => {
    await call("DELETE", "/api/account");
  },
});

export function createApi(
  options: ApiOptions = {},
): Api & SignInApi & SyncApi & HouseholdApi & HouseholdSendApi {
  const call = callerOf(options);
  return {
    ...cookApi(call),
    ...householdSendApi(call),
    ...signInApi(call),
    ...syncApi(call),
    ...householdApi(call),
  };
}
