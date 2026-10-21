// A run's button (ADR 0034): its run, step and key, "w:k3f9q2xa:why:missing",
// well under Telegram's 64 bytes. The label is never in it.

export const buttonValue = (run: string, step: string, key: string) =>
  `w:${run}:${step}:${key}`;

export function parseButton(
  value: string,
): { run: string; step: string; key: string } | null {
  const [w, run, step, key, ...rest] = value.split(":");
  if (w !== "w" || !run || !step || !key || rest.length > 0) return null;
  return { run, step, key };
}
