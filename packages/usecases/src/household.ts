import type { HouseholdReader } from "@cookto/data/read";
import type { HouseholdWriter, SettingsWriter } from "@cookto/data/write";
import {
  MEAL_SLOTS,
  type MealSlot,
  type Member,
  type MemberKind,
} from "@cookto/engine";

// Who eats which meals (ADR 0026), and onboarding asked once (specs/65).
// Every step reads the household as saved, so two quick taps don't undo
// each other.

interface Household {
  household: { reader: HouseholdReader; writer: HouseholdWriter };
}

/** A typed name, or none when it's only spaces. */
const nameOf = (typed: string | undefined) => typed?.trim() || undefined;

/** An empty household starts with one adult eating lunch and dinner. */
export async function startHousehold({ household }: Household): Promise<void> {
  if ((await household.reader.members()).length === 0)
    await household.writer.addMember("adult");
}

export function addPerson(
  { household }: Household,
  kind: MemberKind,
  name?: string,
): Promise<Member> {
  return household.writer.addMember(kind, nameOf(name));
}

export function renamePerson(
  { household }: Household,
  id: string,
  name: string,
): Promise<void> {
  return household.writer.setNickname(id, nameOf(name));
}

/** Ticks a meal for a person, or unticks it; meals stay in the day's order. */
export async function toggleMeal(
  { household }: Household,
  id: string,
  slot: MealSlot,
): Promise<void> {
  const person = (await household.reader.members()).find((m) => m.id === id);
  if (!person) return;
  const eats = person.meals.includes(slot);
  await household.writer.setMeals(
    id,
    MEAL_SLOTS.filter((s) => (s === slot ? !eats : person.meals.includes(s))),
  );
}

export function removePerson(
  { household }: Household,
  id: string,
): Promise<void> {
  return household.writer.removeMember(id);
}

/** Done, if anyone eats at home. Returns whether it finished. */
export async function finishOnboarding({
  household,
  settings,
}: Household & { settings: SettingsWriter }): Promise<boolean> {
  if ((await household.reader.members()).length === 0) return false;
  settings.setOnboarded();
  return true;
}

/** Done for now: with one adult, unless people were already added. */
export async function skipOnboarding(
  deps: Household & { settings: SettingsWriter },
): Promise<void> {
  await startHousehold(deps);
  deps.settings.setOnboarded();
}
