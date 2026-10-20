// The masks a QR code may wear, and how badly a masked code would scan:
// the standard's eight patterns and four penalty rules (ISO/IEC 18004).
// Split from qr.ts to keep each file small.

type Matrix = boolean[][];

export const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** How badly a masked code would scan: the standard's four rules. */
export function penalty(m: Matrix): number {
  const n = m.length;
  let score = 0;
  const at = (r: number, c: number) => m[r]?.[c] ?? false;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        if (at(r - dr, c - dc) === at(r, c)) continue;
        let run = 1;
        while (
          r + dr * run < n &&
          c + dc * run < n &&
          at(r + dr * run, c + dc * run) === at(r, c)
        )
          run++;
        if (run >= 5) score += run - 2;
      }
      if (
        r + 1 < n &&
        c + 1 < n &&
        at(r, c) === at(r, c + 1) &&
        at(r, c) === at(r + 1, c) &&
        at(r, c) === at(r + 1, c + 1)
      )
        score += 3;
    }
  const pattern = [true, false, true, true, true, false, true];
  const light4 = [false, false, false, false];
  for (let r = 0; r < n; r++)
    for (let c = 0; c + 7 <= n; c++) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const line = (from: number, len: number) =>
          Array.from({ length: len }, (_, k) =>
            at(r + dr * (from + k), c + dc * (from + k)),
          );
        if (dr === 1 && r + 7 > n) continue;
        const hit = pattern.every((p, k) => line(0, 7)[k] === p);
        if (!hit) continue;
        const before = line(-4, 4);
        const after = line(7, 4);
        if (
          before.every((v, k) => v === light4[k]) ||
          after.every((v, k) => v === light4[k])
        )
          score += 40;
      }
    }
  const dark = m.flat().filter(Boolean).length;
  const pct = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}
