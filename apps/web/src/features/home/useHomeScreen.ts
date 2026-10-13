import { plannedSlots } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { membersQuery, queries } from "../../platform.js";
import { go } from "../../routes.js";

/** The home screen's words, in the chosen language (ADR 0022: the screen hook). */
export function useHomeScreen() {
  const { locale, t } = useWords();
  const { data } = useQuery(
    {
      ...membersQuery,
      select: (members) => ({
        people: members.length,
        meals: plannedSlots(members).length,
      }),
    },
    queries,
  );
  return {
    ...t,
    /** Today, above the title: "Wednesday 14 October" (#84). */
    date: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date()),
    /** "2 people · 5 meals a day", and Edit (specs/65, criterion 5). */
    household:
      data && data.people > 0
        ? {
            line: fill(t.household, {
              people: count(locale, t.peopleCount, data.people),
              meals: count(locale, t.mealCount, data.meals),
            }),
            edit: t.edit,
            onEdit: () => {
              go("who");
            },
          }
        : null,
  };
}
