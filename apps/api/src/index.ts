import { noSignInYet } from "./auth.js";
import { log } from "./log.js";
import { gemini } from "./receipts/gemini.js";
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
  /** A secret, set in Cloudflare's dashboard (docs/runbooks/receipt-photos.md). */
  GEMINI_API_KEY?: string;
  USAGE: DurableObjectNamespace<UsageCounter>;
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
    });
  },
} satisfies ExportedHandler<Env>;
