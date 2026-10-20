// A QR code (ISO/IEC 18004) of a short text, like the bot's link (specs/216,
// #217), as a square of dark and light modules. Byte mode, error correction
// L or M, versions 1 to 6 (up to 134 bytes), the mask with the least
// penalty. Small on purpose: the app ships no library but React.

export type Level = "L" | "M";

import { MASKS, penalty } from "./qr-mask.js";

export { penalty };

/** Per version, per level: codewords of error correction per block, blocks. */
const BLOCKS: Record<Level, [ec: number, blocks: number][]> = {
  L: [
    [7, 1],
    [10, 1],
    [15, 1],
    [20, 1],
    [26, 1],
    [18, 2],
  ],
  M: [
    [10, 1],
    [16, 1],
    [26, 1],
    [18, 2],
    [24, 2],
    [16, 4],
  ],
};
/** Codewords in all, per version. */
const TOTAL = [26, 44, 70, 100, 134, 172];
/** Where the one alignment pattern sits, per version from 2. */
const ALIGNMENT = [0, 18, 22, 26, 30, 34];
const LEVEL_BITS: Record<Level, number> = { L: 1, M: 0 };

// GF(256) with the standard's polynomial, for Reed-Solomon.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255] ?? 0;
const mul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : (EXP[(LOG[a] ?? 0) + (LOG[b] ?? 0)] ?? 0);

/** The error correction codewords for these data codewords. */
export function reedSolomon(data: number[], ecCount: number): number[] {
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] = (next[j] ?? 0) ^ (gen[j] ?? 0);
      next[j + 1] = (next[j + 1] ?? 0) ^ mul(gen[j] ?? 0, EXP[i] ?? 0);
    }
    gen = next;
  }
  const rest = new Array<number>(ecCount).fill(0);
  for (const d of data) {
    const factor = d ^ (rest.shift() ?? 0);
    rest.push(0);
    for (let j = 0; j < ecCount; j++)
      rest[j] = (rest[j] ?? 0) ^ mul(gen[j + 1] ?? 0, factor);
  }
  return rest;
}

/** The 15 format bits: the level and the mask, BCH-coded and masked. */
export function formatBits(level: Level, mask: number): number {
  const data = (LEVEL_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) & 1 ? 0x537 : 0);
  return ((data << 10) | rem) ^ 0x5412;
}

const dataCount = (version: number, level: Level) => {
  const [ec, blocks] = BLOCKS[level][version - 1] ?? [0, 1];
  return (TOTAL[version - 1] ?? 0) - ec * blocks;
};

/** The smallest version that holds the text, or none. */
function versionFor(bytes: number, level: Level): number | null {
  for (let v = 1; v <= 6; v++) if (bytes + 2 <= dataCount(v, level)) return v;
  return null;
}

/** Mode, count, the bytes, the end, then padding, as codewords. */
export function dataCodewords(
  text: string,
  version: number,
  level: Level,
): number[] {
  const bytes = [...new TextEncoder().encode(text)];
  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  const capacity = dataCount(version, level) * 8;
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8)
    words.push(bits.slice(i, i + 8).reduce((n, bit) => (n << 1) | bit, 0));
  for (let pad = 0xec; words.length < capacity / 8; pad ^= 0xec ^ 0x11)
    words.push(pad);
  return words;
}

/** Data and error correction, in blocks, interleaved as the standard says. */
function codewords(text: string, version: number, level: Level): number[] {
  const [ecCount, blocks] = BLOCKS[level][version - 1] ?? [0, 1];
  const data = dataCodewords(text, version, level);
  const size = data.length / blocks;
  const parts = Array.from({ length: blocks }, (_, b) =>
    data.slice(b * size, (b + 1) * size),
  );
  const ecs = parts.map((p) => reedSolomon(p, ecCount));
  const out: number[] = [];
  for (let i = 0; i < size; i++) for (const p of parts) out.push(p[i] ?? 0);
  for (let i = 0; i < ecCount; i++) for (const e of ecs) out.push(e[i] ?? 0);
  return out;
}

type Matrix = boolean[][];

/** The function patterns, and which modules they are, for a version. */
function functionPatterns(version: number): { m: Matrix; fixed: Matrix } {
  const n = version * 4 + 17;
  const m: Matrix = Array.from({ length: n }, () =>
    new Array<boolean>(n).fill(false),
  );
  const fixed: Matrix = Array.from({ length: n }, () =>
    new Array<boolean>(n).fill(false),
  );
  const set = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    (m[r] ?? [])[c] = dark;
    (fixed[r] ?? [])[c] = true;
  };
  const finder = (top: number, from: number) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        // Dark centre and border, light rings between and around.
        set(top + r, from + c, ring <= 1 || ring === 3);
      }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const a = ALIGNMENT[version - 1] ?? 0;
  if (a > 0)
    for (let r = -2; r <= 2; r++)
      for (let c = -2; c <= 2; c++)
        set(a + r, a + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
  // The format areas are reserved now and written after masking.
  for (let i = 0; i < 9; i++) {
    if (i === 6) continue; // the timing lines cross here
    set(8, i, false);
    set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, n - 1 - i, false);
    set(n - 1 - i, 8, false);
  }
  set(n - 8, 8, true);
  return { m, fixed };
}

/** The codewords zigzagged into the free modules, masked. */
function place(version: number, words: number[], mask: number): Matrix {
  const { m, fixed } = functionPatterns(version);
  const n = m.length;
  const bits = words.flatMap((w) =>
    Array.from({ length: 8 }, (_, i) => ((w >> (7 - i)) & 1) === 1),
  );
  let i = 0;
  let up = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let k = 0; k < n; k++) {
      const r = up ? n - 1 - k : k;
      for (const c of [right, right - 1]) {
        if (fixed[r]?.[c]) continue;
        const bit = bits[i++] ?? false;
        (m[r] ?? [])[c] = bit !== (MASKS[mask]?.(r, c) ?? false);
      }
    }
    up = !up;
  }
  return m;
}

/** Writes the format bits into both of their places. */
function writeFormat(m: Matrix, level: Level, mask: number): void {
  const n = m.length;
  const f = formatBits(level, mask);
  // The standard's figure: the most significant bit first, at (8, 0) and at
  // the bottom of column 8; the dark module above that copy stays.
  for (let i = 0; i < 15; i++) {
    const bit = ((f >> (14 - i)) & 1) === 1;
    const [r, c] =
      i < 6 ? [8, i] : i < 8 ? [8, i + 1] : i === 8 ? [7, 8] : [14 - i, 8];
    (m[r] ?? [])[c] = bit;
    const [r2, c2] = i < 7 ? [n - 1 - i, 8] : [8, n - 15 + i];
    (m[r2] ?? [])[c2] = bit;
  }
}

/**
 * The code for a text: rows of modules, dark being true, without the quiet
 * zone. The mask with the least penalty, unless one is asked for.
 */
export function qrMatrix(
  text: string,
  level: Level = "M",
  mask?: number,
): Matrix {
  const bytes = new TextEncoder().encode(text).length;
  const version = versionFor(bytes, level);
  if (version === null)
    throw new Error(`Too long for a QR code: ${String(bytes)} bytes`);
  const words = codewords(text, version, level);
  const build = (k: number) => {
    const m = place(version, words, k);
    writeFormat(m, level, k);
    return m;
  };
  if (mask !== undefined) return build(mask);
  let best: Matrix | null = null;
  let least = Infinity;
  for (let k = 0; k < 8; k++) {
    const m = build(k);
    const score = penalty(m);
    if (score < least) {
      least = score;
      best = m;
    }
  }
  return best ?? build(0);
}
