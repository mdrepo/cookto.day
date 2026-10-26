import type { Auth } from "../auth.js";
import { json, problem } from "../http.js";
import type { LogEntry } from "../log.js";
import type { Strikes, Usage } from "../usage/usage.js";
import { readCounted } from "./counted.js";
import { readPhoto } from "./photo.js";
import type { Reader } from "./reader.js";

// POST /api/receipts/read (ADR 0028, specs/129-receipt-photos.md). Five
// layers, cheapest first: nothing costs money until the last, and nothing is
// counted until a signed-in household has sent a real photo.

export const ORIGIN = "https://cookto.day";

export interface ReadDeps {
  /** null while receipt photos are off: the switch, or no key. */
  reader: Reader | null;
  auth: Auth;
  usage: Usage;
  strikes: Strikes;
  log: (entry: LogEntry) => void;
  /** Milliseconds since 1970. */
  now: () => number;
}

/** The answer, and what the log line says about it. */
type Done = { response: Response } & Omit<LogEntry, "route" | "status" | "ms">;

function refuse(
  status: number,
  error: string,
  details: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Done {
  return { response: problem(status, error, details, headers), error };
}

async function attempt(request: Request, deps: ReadDeps): Promise<Done> {
  const reader = deps.reader;
  if (reader === null) return refuse(503, "off");
  if (request.headers.get("origin") !== ORIGIN) return refuse(403, "origin");
  const session = await deps.auth.session(request);
  if (session === null) return refuse(401, "signed-out");
  const sent = await readPhoto(request);
  if (!sent.ok) return refuse(sent.status, sent.error);

  const read = await readCounted(
    { reader, usage: deps.usage, strikes: deps.strikes },
    {
      household: session.household,
      // Cloudflare sets it on every request; a missing one shares one count.
      address: request.headers.get("cf-connecting-ip") ?? "unknown",
    },
    sent.photo,
  );
  if (read.ok)
    return {
      response: json(200, read.receipt),
      lines: read.lines,
      tokensIn: read.tokensIn,
      tokensOut: read.tokensOut,
    };
  if (read.status === 429) {
    const wait = Math.ceil((Date.parse(read.resetsAt) - deps.now()) / 1000);
    return refuse(
      429,
      "limit",
      { limit: read.limit, resetsAt: read.resetsAt },
      { "retry-after": String(Math.max(0, wait)) },
    );
  }
  if (read.status === 502) return refuse(502, "reader");
  return {
    ...refuse(422, read.error),
    ...(read.sign !== undefined && { sign: read.sign }),
    tokensIn: read.tokensIn,
    tokensOut: read.tokensOut,
  };
}

export async function readReceipt(
  request: Request,
  deps: ReadDeps,
): Promise<Response> {
  const started = deps.now();
  let done: Done;
  try {
    done = await attempt(request, deps);
  } catch {
    // The counter or sign-in failed: refuse, in JSON, and call nothing more.
    done = refuse(500, "server");
  }
  const { response, ...details } = done;
  deps.log({
    route: "receipts/read",
    status: response.status,
    ms: deps.now() - started,
    ...details,
  });
  return response;
}
