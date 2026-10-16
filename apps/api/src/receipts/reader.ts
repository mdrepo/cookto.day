// What reads a receipt photo (ADR 0028). Gemini is one; another provider
// would be another file with the same shape.

export type PhotoType = "image/jpeg" | "image/webp";

export interface Photo {
  bytes: Uint8Array;
  type: PhotoType;
}

/**
 * - `unavailable`: the provider refused, failed or didn't answer in time.
 *   No answer came back, so the read is given back.
 * - `unreadable`: it answered, and billed for it, but not with a usable
 *   list: cut short, blocked, or not JSON. The read still counts.
 */
export type ReaderResult =
  | { ok: true; output: unknown; tokensIn: number; tokensOut: number }
  | { ok: false; reason: "unavailable" }
  | { ok: false; reason: "unreadable"; tokensIn: number; tokensOut: number };

export interface Reader {
  read(photo: Photo): Promise<ReaderResult>;
}
