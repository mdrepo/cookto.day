import { noSignInYet } from "./auth.js";
import { type KeysReport, keysChecker } from "./keys.js";
import { log } from "./log.js";
import { gemini, network } from "./receipts/gemini.js";
import { route } from "./router.js";
import type { UsageCounter } from "./usage/durable.js";
import type { Strikes, Usage } from "./usage/usage.js";

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
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  USAGE: DurableObjectNamespace<UsageCounter>;
}

/** One checker for the isolate's life, so its minute of memory counts. */
let keys: (() => Promise<KeysReport>) | null = null;
function keysOf(env: Env): () => Promise<KeysReport> {
  keys ??= keysChecker({
    keys: {
      telegram: env.TELEGRAM_BOT_TOKEN,
      supabaseUrl: env.SUPABASE_URL,
      supabaseKey: env.SUPABASE_ANON_KEY,
      gemini: env.GEMINI_API_KEY,
    },
    send: network,
    now: () => Date.now(),
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
  fetch(request, env) {
    const key = env.GEMINI_API_KEY ?? "";
    const on = env.RECEIPT_PHOTOS === "on" && key !== "";
    const counter = usage(env);
    return route(request, {
      reader: on ? gemini({ key, model: env.RECEIPT_MODEL }) : null,
      auth: noSignInYet,
      usage: counter,
      strikes: counter,
      log,
      now: () => Date.now(),
      keys: keysOf(env),
    });
  },
} satisfies ExportedHandler<Env>;
