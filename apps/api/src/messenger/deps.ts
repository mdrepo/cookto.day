import type { Links } from "@cookto/db";
import type { Messenger } from "@cookto/messenger";
import type { LogEntry } from "../log.js";

// What the messenger's routes need (spec #207): the messenger itself, the
// links, and a way to hash a network address before it reaches the database.

export interface MessengerDeps {
  messenger: Messenger;
  links: Links;
  /** Keys the address hash (ADR 0028); never stored, never the address. */
  addressSecret: string;
  /** Work to finish after the answer is sent (the drain). */
  after: (work: Promise<unknown>) => void;
  log: (entry: LogEntry) => void;
  /** Milliseconds since 1970. */
  now: () => number;
}

/** The link's token from the Authorization header, or null. */
export function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

/** sha256, hex: what the database keeps of a token. */
export async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const iso = (ms: number) => new Date(ms).toISOString();

/** The last path segment: the code or the message id a route names. */
export const lastSegment = (request: Request) =>
  decodeURIComponent(new URL(request.url).pathname.split("/").pop() ?? "");
