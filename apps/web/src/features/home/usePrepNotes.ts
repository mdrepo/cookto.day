import { type PrepEvent, prepEvents } from "@cookto/engine";
import { prepDone, prepNotDone } from "@cookto/usecases";
import { namer, SLOT_WORDS } from "../../food.js";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { plans, timeOfDay } from "../../platform.js";
import { prepWords } from "../../prep.js";
import { useMealPlans } from "./useMealPlans.js";

/**
 * What's due for prep (specs/144): tonight's, with "Done"; prep under way;
 * and the morning's question, "Yes" or "No". The engine's events, in words.
 */
export function usePrepNotes() {
  const { locale, t } = useWords();
  const m = useMealPlans();
  if (!m) return null;
  const name = namer(m.packs, locale);
  const words = prepWords(name, t, locale);
  const k = { plans };
  const time = m.now.slice(11);
  const item = (e: PrepEvent) => {
    const meal = t[SLOT_WORDS[e.slot]];
    const base = {
      key: `${e.on}/${e.slot}`,
      line: `${name("dishes", e.dish)} · ${meal}`,
    };
    if (e.kind === "under-way")
      return {
        ...base,
        text: words.since(e.prep, e.since && timeOfDay(e.since, locale)),
        actions: [],
      };
    if (e.kind === "tonight")
      return {
        ...base,
        text: fill(t.prepTonight, {
          do: words.doing(e.prep),
          meal: meal.toLocaleLowerCase(locale),
        }),
        actions: [
          {
            label: t.done,
            onPress: () => {
              void prepDone(k, e.on, e.slot, time);
            },
          },
        ],
      };
    return {
      ...base,
      text: fill(t.prepAsk, { do: words.doing(e.prep) }),
      actions: [
        {
          label: t.yes,
          onPress: () => {
            void prepDone(k, e.on, e.slot, "");
          },
        },
        {
          label: t.no,
          onPress: () => {
            void prepNotDone(k, e.on, e.slot);
          },
        },
      ],
    };
  };
  const events = prepEvents({
    now: m.now,
    plans: m.plans,
    dishes: m.dishes,
    beans: m.beans,
  });
  return { title: t.prep, items: events.map(item) };
}
