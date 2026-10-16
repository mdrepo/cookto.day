// Who is asking (ADR 0025). Sign-in will read the session from its cookie;
// until it ships, nobody is signed in, so nothing that needs a session runs.

export interface Session {
  /** Our own id for the person, never the auth service's (ADR 0025). */
  account: string;
  household: string;
}

export interface Auth {
  session(request: Request): Promise<Session | null>;
}

export const noSignInYet: Auth = {
  session: () => Promise.resolve(null),
};
