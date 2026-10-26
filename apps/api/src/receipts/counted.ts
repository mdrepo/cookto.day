import type { LimitName } from "../usage/limits.js";
import type { Strikes, Usage, Who } from "../usage/usage.js";
import type { Photo, Reader } from "./reader.js";
import { checkReceipt, type Receipt, signOfAbuse } from "./receipt.js";

// A photo already judged small and real, read within the limits (ADR 0028):
// counted before the AI is called, given back when it fails, a sign of
// abuse ends the household's day. The API's route and the bot (specs/277)
// both read this way; each says the outcome in its own words.

export interface Reading {
  reader: Reader;
  usage: Usage;
  strikes: Strikes;
}

/** How a read went, with what its log line says. */
export type Counted =
  | {
      ok: true;
      receipt: Receipt;
      lines: number;
      tokensIn: number;
      tokensOut: number;
    }
  | {
      ok: false;
      status: 429;
      error: "limit";
      limit: LimitName;
      resetsAt: string;
    }
  | { ok: false; status: 502; error: "reader" }
  | {
      ok: false;
      status: 422;
      error: "rejected" | "not-a-receipt";
      sign?: string;
      tokensIn: number;
      tokensOut: number;
    };

export async function readCounted(
  r: Reading,
  who: Who,
  photo: Photo,
): Promise<Counted> {
  const verdict = await r.usage.take(who);
  if (!verdict.ok)
    return {
      ok: false,
      status: 429,
      error: "limit",
      limit: verdict.limit,
      resetsAt: verdict.resetsAt,
    };
  const read = await r.reader.read(photo);
  if (!read.ok && read.reason === "unavailable") {
    await r.usage.giveBack(verdict.ticket);
    return { ok: false, status: 502, error: "reader" };
  }
  const tokens = { tokensIn: read.tokensIn, tokensOut: read.tokensOut };
  // Rule 8: a sign of abuse refuses the answer whole, and ends the day.
  const reject = async (sign: string): Promise<Counted> => {
    await r.strikes.strike(verdict.ticket);
    return { ok: false, status: 422, error: "rejected", sign, ...tokens };
  };
  if (!read.ok) return reject(read.reason);
  const sign = signOfAbuse(read.output);
  if (sign !== undefined) return reject(sign);
  const receipt = checkReceipt(read.output);
  if (receipt.lines.length === 0)
    return { ok: false, status: 422, error: "not-a-receipt", ...tokens };
  return { ok: true, receipt, lines: receipt.lines.length, ...tokens };
}
