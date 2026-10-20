import type { Call } from "@cookto/db";
import type { Send } from "../network.js";

// Postgres over HTTPS (ADR 0031, 0032): each of the database's functions is
// one POST to Supabase's rpc endpoint, with the publishable key. The
// function's own secret check is what guards it; the key only names the
// project. An error carries the function and the status, never content.

export interface PostgrestOptions {
  url: string;
  key: string;
  send: Send;
  timeoutMs?: number;
}

export function postgrest(o: PostgrestOptions): Call {
  const timeout = o.timeoutMs ?? 10_000;
  return async (fn, args) => {
    const response = await o.send(`${o.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: o.key,
        authorization: `Bearer ${o.key}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`db ${fn} ${String(response.status)}`);
    const text = await response.text();
    return text === "" ? null : (JSON.parse(text) as unknown);
  };
}
