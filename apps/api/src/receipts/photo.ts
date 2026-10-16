import type { Photo, PhotoType } from "./reader.js";

// specs/129-receipt-photos.md, rule 3: one photo of at most 1.5 MB, judged by
// its first bytes, never by the label the sender put on it. The body is read
// with a cap, so a sender can't make us hold more than that.

export const MAX_PHOTO_BYTES = 1_500_000;

export type PhotoResult =
  | { ok: true; photo: Photo }
  | { ok: false; status: 413; error: "too-big" }
  | { ok: false; status: 415; error: "type" };

const TOO_BIG = { ok: false, status: 413, error: "too-big" } as const;
const NOT_A_PHOTO = { ok: false, status: 415, error: "type" } as const;

const startsWith = (bytes: Uint8Array, at: number, expected: number[]) =>
  expected.every((byte, i) => bytes[at + i] === byte);

const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

/** JPEG starts FF D8 FF; WebP is a RIFF file whose type, at byte 8, is WEBP. */
export function photoType(bytes: Uint8Array): PhotoType | null {
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, 0, RIFF) && startsWith(bytes, 8, WEBP))
    return "image/webp";
  return null;
}

/** The whole body, or null as soon as it passes `max` bytes. */
async function readCapped(
  body: ReadableStream<unknown>,
  max: number,
): Promise<Uint8Array | null> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!(value instanceof Uint8Array)) {
      await reader.cancel();
      return null;
    }
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

export async function readPhoto(
  request: Request,
  max = MAX_PHOTO_BYTES,
): Promise<PhotoResult> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > max) return TOO_BIG;
  if (request.body === null) return NOT_A_PHOTO;
  const bytes = await readCapped(request.body, max);
  if (bytes === null) return TOO_BIG;
  const type = photoType(bytes);
  return type === null ? NOT_A_PHOTO : { ok: true, photo: { bytes, type } };
}
