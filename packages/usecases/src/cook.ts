import type {
  Api,
  Cook,
  HouseholdSendApi,
  LinkMade,
  PlanSent,
} from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import type { CookWriter } from "@cookto/data/write";

// The cook's Telegram (specs/207): connect her from this phone, send her
// tomorrow's plan now or at 9 pm, disconnect. The phone keeps only the
// link's token and what last went to her; the API keeps the rest. Once she
// belongs to the household (specs/217) the token is null: the session sends,
// and a plan still waiting is replaced by the send itself.

interface Deps {
  /** The household's way to send is there once a phone has signed in. */
  api: Api & Partial<HouseholdSendApi>;
  settings: CookWriter;
}

/** "Connect": a code to send her, and the token this phone keeps. */
export function connectCook({ api }: Pick<Deps, "api">): Promise<LinkMade> {
  return api.makeLink();
}

/** Asked every few seconds while the code shows: has she sent it? */
export async function cookConnected(
  { api, settings }: Deps,
  made: LinkMade,
  now: string,
): Promise<"waiting" | "connected" | "expired" | "gone"> {
  if (made.expiresAt <= now) return "expired";
  const state = await api.linkState(made.token, made.code);
  if (state === "connected")
    settings.setCook({
      token: made.token,
      connectedAt: now,
      sent: null,
      scheduled: null,
    });
  return state;
}

/** "Disconnect", from the planner's side. The API's answer doesn't matter. */
export async function disconnectCook(
  { api, settings }: Deps,
  cook: Cook,
): Promise<void> {
  if (cook.token !== null) await api.unlink(cook.token).catch(() => undefined);
  settings.setCook(null);
}

/** What a send came to: sent, the cook left, or it couldn't go. */
export type Sent = "sent" | "gone" | "failed";

/** The context a day's plan carries, so a newer one replaces it. */
const contextOf = (on: string) => `plan:${on}`;

/** The cook has gone, or the household has none: this phone forgets her. */
function gone({ settings }: Deps): "gone" {
  settings.setCook(null);
  return "gone";
}

/**
 * "Looks good", "Send again", "Send to the cook": tomorrow's plan, now. A
 * plan still waiting for 9 pm is cancelled first.
 */
export async function sendTomorrow(
  deps: Deps,
  cook: Cook,
  plan: { on: string; text: string },
  now: string,
): Promise<Sent> {
  const { api, settings } = deps;
  const waiting = cook.scheduled?.on === plan.on ? cook.scheduled.id : null;
  try {
    const request = { text: plan.text, context: contextOf(plan.on) };
    if (cook.token === null) {
      if (!api.sendThroughHousehold) return "failed";
      await api.sendThroughHousehold(request);
    } else {
      if (waiting !== null)
        await api.cancel(cook.token, waiting).catch(() => undefined);
      await api.send(cook.token, request);
    }
  } catch (e) {
    return e instanceof ApiError && (e.status === 404 || e.status === 409)
      ? gone(deps)
      : "failed";
  }
  const sent: PlanSent = { ...plan, at: now, id: null };
  settings.setCook({ ...cook, sent, scheduled: null });
  return "sent";
}

/**
 * Silence is yes, and the cook still gets it: the plan as it stands waits
 * for 9 pm on the server. A newer version replaces it; the same one is left.
 */
export async function scheduleTomorrow(
  deps: Deps,
  cook: Cook,
  plan: { on: string; text: string },
  at: string,
): Promise<Sent> {
  const { api, settings } = deps;
  try {
    const request = { text: plan.text, at, context: contextOf(plan.on) };
    if (cook.token === null && !api.sendThroughHousehold) return "failed";
    const { id } =
      cook.token === null && api.sendThroughHousehold
        ? await api.sendThroughHousehold(request)
        : await api.send(cook.token ?? "", request);
    settings.setCook({ ...cook, scheduled: { ...plan, at, id } });
    return "sent";
  } catch (e) {
    return e instanceof ApiError && (e.status === 404 || e.status === 409)
      ? gone(deps)
      : "failed";
  }
}
