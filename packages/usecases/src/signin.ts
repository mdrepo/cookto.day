import type { LinkMade, SignInApi, TelegramAppApi } from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import type {
  SettingsWriter,
  SignInWriter,
  WhoCooksWriter,
} from "@cookto/data/write";

// Sign in with Telegram (specs/216): a code to press Start with, polled
// until Start happened; the session is a cookie only the API reads, so the
// phone keeps only the first name. Sign out forgets it, whatever the API
// said; a 401 means signed out elsewhere, and the phone forgets it too.

interface Deps {
  api: SignInApi;
  settings: SignInWriter;
}

/** "Continue": a code for the bot, and the token this phone polls with. */
export function startSignIn({ api }: Pick<Deps, "api">): Promise<LinkMade> {
  return api.startSignIn();
}

/** Asked every few seconds while the code shows: has Start happened? */
export async function signInConnected(
  { api, settings }: Deps,
  made: LinkMade,
  now: string,
): Promise<"waiting" | "signed-in" | "expired"> {
  if (made.expiresAt <= now) return "expired";
  try {
    const status = await api.signInStatus(made.token, made.code);
    if (status.used) {
      settings.setSignedIn({ name: status.name, at: now });
      return "signed-in";
    }
    return status.state === "expired" ? "expired" : "waiting";
  } catch (e) {
    // A link that's gone is as good as run out; no network means wait.
    return e instanceof ApiError && e.status === 404 ? "expired" : "waiting";
  }
}

/** When Settings opens signed in: does the session still work? */
export async function checkSignedIn(
  { api, settings }: Deps,
  now: string,
): Promise<"signed-in" | "signed-out" | "unknown"> {
  try {
    const { name } = await api.me();
    settings.setSignedIn({ name, at: now });
    return "signed-in";
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      settings.setSignedIn(null);
      return "signed-out";
    }
    return "unknown";
  }
}

/**
 * A page the bot opened inside Telegram (specs/241), signed in with the
 * proof Telegram handed it. Telegram's window keeps nothing of the phone's
 * app, so it becomes a planner's phone, set up, at once. Whether it worked.
 */
export async function signInFromTelegram(
  {
    api,
    settings,
  }: {
    api: TelegramAppApi;
    settings: SignInWriter & WhoCooksWriter & SettingsWriter;
  },
  initData: string,
  now: string,
): Promise<boolean> {
  try {
    const { name } = await api.telegramSignIn(initData);
    settings.setSignedIn({ name, at: now });
    settings.setRole("plan");
    settings.setOnboarded();
    return true;
  } catch {
    return false;
  }
}

/** "Sign out": the session ends on the server, and this phone forgets. */
export async function signOut({ api, settings }: Deps): Promise<void> {
  await api.signOut().catch(() => undefined);
  settings.setSignedIn(null);
}
