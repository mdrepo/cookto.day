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
 * - `cut-off`: it answered, and billed for it, up to the length cap.
 * - `unreadable`: it answered, and billed for it, but blocked or not JSON.
 * The last two still count, and are signs of abuse (spec #129, rule 8).
 */
export type ReaderResult =
  | { ok: true; output: unknown; tokensIn: number; tokensOut: number }
  | { ok: false; reason: "unavailable" }
  | {
      ok: false;
      reason: "cut-off" | "unreadable";
      tokensIn: number;
      tokensOut: number;
    };

export interface Reader {
  read(photo: Photo): Promise<ReaderResult>;
}
