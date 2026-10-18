import { overnight, type Prep, type PrepKind } from "@cookto/engine";
import { listOf, type namer } from "./food.js";
import type { Messages } from "./i18n/en.js";
import { count, fill } from "./i18n/format.js";

// Prep in words (specs/144), for Today, Dishes and a dish's page: "Soak the
// chickpeas 8 hours before", "soak the chickpeas", "Soaking since 9 pm".

const KIND = {
  soak: "Soak",
  marinate: "Marinate",
  ferment: "Ferment",
  thaw: "Thaw",
} as const satisfies Record<PrepKind, string>;

/** A dish's prep, one entry per kind: its foods, and the longest wait. */
function byKind(prep: readonly Prep[]) {
  const kinds = new Map<PrepKind, { foods: string[]; hours: number }>();
  for (const p of prep) {
    const kind = kinds.get(p.do) ?? { foods: [], hours: 0 };
    kind.foods.push(p.what);
    kind.hours = Math.max(kind.hours, p.hours);
    kinds.set(p.do, kind);
  }
  return [...kinds];
}

export function prepWords(
  name: ReturnType<typeof namer>,
  t: Messages,
  locale: string,
) {
  const food = (ids: readonly string[]) =>
    listOf(
      locale,
      ids.map((id) => name("ingredients", id).toLocaleLowerCase(locale)),
    );
  return {
    /**
     * What to do, as a line: "Soak the chickpeas 8 hours before"; on a
     * dish's page, "Soak the chickpeas overnight, at least 8 hours".
     */
    lines(prep: readonly Prep[], page = false): string[] {
      const night = page && overnight(prep);
      return byKind(prep).map(([kind, { foods, hours }]) =>
        fill(
          count(
            locale,
            t[`prep${KIND[kind]}${night ? "Overnight" : "Before"}`],
            hours,
          ),
          { food: food(foods) },
        ),
      );
    },
    /** What to do, inside a sentence: "soak the chickpeas". */
    doing(prep: readonly Prep[]): string {
      return listOf(
        locale,
        byKind(prep).map(([kind, { foods }]) =>
          fill(t[`do${KIND[kind]}`], { food: food(foods) }),
        ),
      );
    },
    /** Under way: "Soaking since 9 pm"; marked in the morning, "Done last night". */
    since(prep: readonly Prep[], time: string): string {
      const [first] = byKind(prep);
      if (!first || time === "") return t.prepDoneLastNight;
      return fill(t[`since${KIND[first[0]]}`], { time });
    },
  };
}
