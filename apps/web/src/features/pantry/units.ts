import type { Unit } from "@cookto/engine";

// The units people type amounts in. The pantry keeps grams, millilitres or
// pieces (ADR 0027); kilograms and litres are only for typing and showing.

export const UNIT_CHOICES = ["g", "kg", "ml", "l", "pieces"] as const;
export type UnitChoice = (typeof UNIT_CHOICES)[number];

export function toGramsOrMl(
  n: number,
  unit: UnitChoice,
): { amount: number; unit: Unit } {
  if (unit === "kg") return { amount: n * 1000, unit: "g" };
  if (unit === "l") return { amount: n * 1000, unit: "ml" };
  return { amount: n, unit };
}
