import {
  functionAuth,
  functionHouseholds,
  functionLinks,
  functionRuns,
  functionStore,
} from "@cookto/db";
import { createMessenger, telegram } from "@cookto/messenger";
import { EN } from "@cookto/templates";
import { noSignInYet } from "./auth.js";
import { type KeysReport, keysChecker } from "./keys.js";
import { log } from "./log.js";
import type { MessengerDeps } from "./messenger/deps.js";
import { postgrest } from "./messenger/postgrest.js";
import { network } from "./network.js";
import { gemini } from "./receipts/gemini.js";
import { route } from "./router.js";
import type { UsageCounter } from "./usage/durable.js";
import type { Strikes, Usage } from "./usage/usage.js";
import { ACTIONS } from "./workflows/actions.js";
import { tick } from "./workflows/engine.js";
import { WORKFLOWS } from "./workflows/registry.js";

export { UsageCounter } from "./usage/durable.js";

// The Worker behind cookto.day/api/* (ADR 0025). The site's own files never
// reach it: apps/web/wrangler.jsonc sends only /api/* here. This file only
// hands the real services to the routes, which are tested on their own.

interface Env {
  /** "on" turns receipt photos on (ADR 0028); anything else leaves them off. */
  RECEIPT_PHOTOS?: string;
  RECEIPT_MODEL: string;
  /** Secrets, saved with apps/api/scripts/secret.sh (docs/runbooks/). */
  GEMINI_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Saved by db/scripts/migrate.sh secret (ADR 0032). */
  MESSENGER_API_SECRET?: string;
  /** "1" stops every run starting and every run's message (ADR 0034). */
  BOT_OFF?: string;
  USAGE: DurableObjectNamespace<UsageCounter>;
}

/** Where Telegram sends updates (spec #207). */
export const WEBHOOK_URL = "https://cookto.day/api/messenger/telegram";
/** The cron that runs the nightly housekeeping; the other drains the outbox. */
const NIGHTLY = "0 3 * * *";

const now = () => Date.now();

/** The messenger's parts, or null until every secret it needs is saved. */
function messengerOf(
  env: Env,
  ctx: ExecutionContext,
): { deps: MessengerDeps; install: () => Promise<"set" | "kept"> } | null {
  const {
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_WEBHOOK_SECRET: secret,
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: key,
    MESSENGER_API_SECRET: apiSecret,
  } = env;
  if (!token || !secret || !url || !key || !apiSecret) return null;
  const channel = telegram({ token, secret, send: network });
  const call = postgrest({ url, key, send: network });
  const messenger = createMessenger({
    channel,
    store: functionStore(call, apiSecret),
    now: () => new Date().toISOString(),
  });
  return {
    deps: {
      messenger,
      links: functionLinks(call, apiSecret),
      auth: functionAuth(call, apiSecret),
      households: functionHouseholds(call, apiSecret),
      addressSecret: apiSecret,
      after: (work) => {
        ctx.waitUntil(work);
      },
      log,
      now,
      workflows: {
        runs: functionRuns(call, apiSecret),
        workflows: WORKFLOWS,
        actions: ACTIONS,
        templates: { en: EN },
        off: env.BOT_OFF === "1",
        leaseMs: 30_000,
      },
    },
    install: () => channel.installWebhook(WEBHOOK_URL),
  };
}

/** One checker for the isolate's life, so its minute of memory counts. */
let keys: (() => Promise<KeysReport>) | null = null;
function keysOf(env: Env, ctx: ExecutionContext): () => Promise<KeysReport> {
  keys ??= keysChecker({
    keys: {
      telegram: env.TELEGRAM_BOT_TOKEN,
      supabaseUrl: env.SUPABASE_URL,
      supabaseKey: env.SUPABASE_ANON_KEY,
      gemini: env.GEMINI_API_KEY,
    },
    send: network,
    now,
    install: messengerOf(env, ctx)?.install,
  });
  return keys;
}

function usage(env: Env): Usage & Strikes {
  const counter = env.USAGE.get(env.USAGE.idFromName("everyone"));
  return {
    take: (who) => counter.take(who),
    giveBack: (ticket) => counter.giveBack(ticket),
    strike: (ticket) => counter.strike(ticket),
  };
}

export default {
  fetch(request, env, ctx) {
    const key = env.GEMINI_API_KEY ?? "";
    const on = env.RECEIPT_PHOTOS === "on" && key !== "";
    const counter = usage(env);
    return route(request, {
      reader: on ? gemini({ key, model: env.RECEIPT_MODEL }) : null,
      auth: noSignInYet,
      usage: counter,
      strikes: counter,
      log,
      now,
      keys: keysOf(env, ctx),
      messenger: messengerOf(env, ctx)?.deps ?? null,
    });
  },

  // Every minute, the runs that are due or expired (ADR 0034), then what the
  // outbox owes; at 3 UTC, the housekeeping (ADR 0031).
  scheduled(event, env, ctx) {
    const m = messengerOf(env, ctx);
    if (m === null) return;
    const started = now();
    const work =
      event.cron === NIGHTLY
        ? Promise.all([
            m.deps.links.housekeeping(new Date(started).toISOString()),
            m.deps.auth.housekeeping(new Date(started).toISOString()),
            m.deps.households.housekeeping(new Date(started).toISOString()),
          ]).then(([gone, sessions, changes]) => {
            log({
              route: "cron/housekeeping",
              status: 200,
              ms: now() - started,
              ...gone,
              ...sessions,
              ...changes,
            });
          })
        : Promise.all([
            // A run that fails is logged; the outbox is still drained.
            tick(m.deps).catch((e: unknown) => {
              log({
                route: "cron/runs",
                status: 500,
                ms: now() - started,
                error: e instanceof Error ? e.message : "unknown",
              });
              return { started: 0, expired: 0 };
            }),
            m.deps.messenger.drain(),
          ]).then(([runs, done]) => {
            if (done.length === 0 && runs.started + runs.expired === 0) return;
            log({
              route: "cron/drain",
              status: 200,
              ms: now() - started,
              sent: done.filter((d) => d.outcome === "sent").length,
              failed: done.filter((d) => d.outcome !== "sent").length,
              ...runs,
            });
          });
    ctx.waitUntil(work);
  },
} satisfies ExportedHandler<Env>;
