import type { AppPack } from "@cookto/data";
import {
  type Beans,
  goesOffWith,
  MEAL_SLOTS,
  type MealSlot,
  type Member,
  overnight,
  type PantryItem,
  prepFor,
  servings,
} from "@cookto/engine";

// The plan's lines as the bot says them (specs/270): each meal for how
// many, "For Aarav:" on the child's own dish, one reason when a dish uses
// food that goes off within a day of the meal, and tonight's prep. Each line
// is a message of its own. The caller has the words, by template id, and
// says a day's name.

export type Word = (id: string, slots?: Record<string, unknown>) => string;

/** A meal's planned dish, as the household's records hold it. */
export interface Planned {
  slot: MealSlot;
  dish: string;
  child: boolean;
  /** The child's extra, by Wikidata id. */
  addIn?: string;
}

export interface PlanInput {
  day: string;
  planned: readonly Planned[];
  people: readonly Member[];
  packs: readonly AppPack[];
  pantry: readonly PantryItem[];
  beans: Beans;
  word: Word;
  /** "Friday", from "2026-10-23". */
  dayName: (day: string) => string;
}

const isChild = (m: Member) => m.kind !== "adult";

/** Whom the child's dish is for: Aarav, the child, or the children. */
function childOf(slot: MealSlot, people: readonly Member[], word: Word) {
  const children = people.filter((m) => isChild(m) && m.meals.includes(slot));
  if (children.length > 1) return word("the_children");
  const nickname = children[0]?.nickname;
  return nickname ? nickname : word("the_child");
}

/** A food's English name, as people say it in a sentence. */
const foodName = (packs: readonly AppPack[], id: string) =>
  (
    packs.map((p) => p.words.en?.ingredients[id]).find(Boolean) ?? id
  ).toLocaleLowerCase("en");

export function planLines(p: PlanInput, reasons: boolean): string[] {
  const { planned, people, packs, word } = p;
  const dishes = packs.flatMap((pack) => pack.dishes);
  const names = Object.assign(
    {} as Record<string, string>,
    ...packs.map((pack) => pack.words.en?.dishes ?? {}),
  ) as Record<string, string>;
  const name = (dish: string) => names[dish] ?? dish;
  return MEAL_SLOTS.flatMap((slot) =>
    planned
      .filter((m) => m.slot === slot)
      .map((m) => {
        if (m.child)
          return word("plan_child", {
            child: childOf(slot, people, word),
            dish: name(m.dish),
          });
        const ownChild = planned.some((x) => x.slot === slot && x.child);
        const line = word("plan_meal", {
          Meal: word(`meal_${slot.replace("-", "_")}`),
          n: servings(slot, people, ownChild),
          dish: name(m.dish),
        });
        const uses = dishes.find((d) => d.id === m.dish)?.ingredients ?? [];
        const off = reasons ? goesOffWith(uses, p.pantry, p.day) : null;
        if (!off) return line;
        const reason = word("plan_reason", {
          food: foodName(packs, off.ingredient),
          day: p.dayName(off.useBy),
        });
        return `${line} ${reason}`;
      }),
  );
}

/** "Tonight: soak the chickpeas.", for each dish whose prep starts tonight. */
export function tonightLines(p: PlanInput): string[] {
  const dishes = p.packs.flatMap((pack) => pack.dishes);
  return p.planned.flatMap((m) => {
    const prep = prepFor(dishes.find((d) => d.id === m.dish) ?? {}, p.beans);
    if (!overnight(prep)) return [];
    const todo = prep.map((x) =>
      p.word(`prep_${x.do}`, { what: foodName(p.packs, x.what) }),
    );
    return [p.word("plan_tonight", { prep: todo.join(" and ") })];
  });
}
