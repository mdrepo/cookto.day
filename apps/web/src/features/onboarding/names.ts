import type { Member } from "@cookto/engine";
import type { Messages } from "../../i18n/en.js";

// What onboarding calls people, in the page's language. Meals' words are
// SLOT_WORDS in food.ts, shared by every screen.

/**
 * A person's name, or their kind: "Adult", or "Child 2" when there's more
 * than one child (specs/65-onboarding.md, criterion 3).
 */
export function titleOf(
  person: Member,
  number: number | null,
  t: Messages,
): string {
  if (person.nickname) return person.nickname;
  return number === null ? t[person.kind] : `${t[person.kind]} ${number}`;
}

/** Where a person comes among those of their kind, when there are several. */
export function numberOf(person: Member, members: readonly Member[]) {
  const same = members.filter((m) => m.kind === person.kind);
  return same.length > 1 ? same.indexOf(person) + 1 : null;
}
