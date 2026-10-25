// The cook's Telegram (specs/207) and who this phone is signed in as
// (specs/216): settings of this phone, kept like the role, never synced.
// Split from settings.ts to keep each file under its size.

/** Tomorrow's plan as it last went to the cook, or waits to (specs/207). */
export interface PlanSent {
  on: string;
  text: string;
  /** When it was sent, or when it will be. */
  at: string;
  /** The API's id of a message still waiting, so it can be cancelled. */
  id: string | null;
}

/** The cook's Telegram, connected from this phone (specs/207). */
export interface Cook {
  /**
   * The link's token, the only thing that lets a phone send on its own;
   * null once she belongs to the household (specs/217): the session sends.
   */
  token: string | null;
  connectedAt: string;
  /** The plan last sent to her. */
  sent: PlanSent | null;
  /** The plan waiting to go at 9 pm. */
  scheduled: PlanSent | null;
  /** The household's cook's first name, from Telegram (specs/270). */
  name?: string | null;
}

/** Who this phone is signed in as (specs/216): a name, never a token. */
export interface SignedIn {
  name: string;
  at: string;
}

/** The cook's Telegram and what went to her (specs/207), for its use cases. */
export interface CookWriter {
  /** The cook as this phone has her now. */
  cook(): Cook | null;
  setCook(cook: Cook | null): void;
}

/** Signed in, or out (specs/216), for its use cases only. */
export interface SignInWriter {
  setSignedIn(signedIn: SignedIn | null): void;
}

const isString = (v: unknown): v is string => typeof v === "string";

/** The saved cook, or none when missing or not what we saved. */
export function readCook(text: string | null): Cook | null {
  try {
    const v = JSON.parse(text ?? "null") as
      (Omit<Cook, "token"> & { token: unknown }) | null;
    if (!v || !isString(v.connectedAt)) return null;
    // A token, or null once she belongs to the household (specs/217).
    const token = v.token;
    if (token !== null && !isString(token)) return null;
    const plan = (p: PlanSent | null) => (isString(p?.text) ? p : null);
    return { ...v, token, sent: plan(v.sent), scheduled: plan(v.scheduled) };
  } catch {
    return null;
  }
}

/** The saved sign-in, or none when it's missing or not what we saved. */
export function readSignedIn(text: string | null): SignedIn | null {
  try {
    const v = JSON.parse(text ?? "null") as SignedIn | null;
    if (!v || !isString(v.name) || !isString(v.at)) return null;
    return { name: v.name, at: v.at };
  } catch {
    return null;
  }
}
