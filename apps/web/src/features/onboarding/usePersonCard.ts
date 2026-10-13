import { MEAL_SLOTS } from "@cookto/engine";
import { removePerson, renamePerson, toggleMeal } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { household, membersQuery, queries, settings } from "../../platform.js";
import { numberOf, SLOT_WORDS, titleOf } from "./names.js";

const deps = { household, settings: settings.writer };

/**
 * One person's card. It selects only that person (and their number among
 * their kind), so another person's change leaves it as it was (ADR 0023,
 * criterion 9).
 */
export function usePersonCard(id: string) {
  const { t } = useWords();
  const { data } = useQuery(
    {
      ...membersQuery,
      select: (members) => {
        const person = members.find((m) => m.id === id);
        return person ? { person, number: numberOf(person, members) } : null;
      },
    },
    queries,
  );
  const person = data?.person;
  const title = person ? titleOf(person, data.number, t) : "";
  return {
    shown: person !== undefined,
    title,
    /** What they're called without a name, shown in the empty name box. */
    kindName: person
      ? titleOf({ ...person, nickname: "" }, data.number, t)
      : "",
    nickname: person?.nickname ?? "",
    toddlerFood: person?.kind === "toddler" ? t.toddlerFood : null,
    nameLabel: t.nameOptional,
    mealsLabel: t.meals,
    removeLabel: fill(t.removePerson, { name: title }),
    meals: MEAL_SLOTS.map((slot) => ({
      slot,
      label: t[SLOT_WORDS[slot]],
      pressed: person?.meals.includes(slot) ?? false,
      toggle: () => void toggleMeal(deps, id, slot),
    })),
    rename: (name: string) => void renamePerson(deps, id, name),
    remove: () => void removePerson(deps, id),
  };
}
