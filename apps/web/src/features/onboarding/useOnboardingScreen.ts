import { plannedSlots } from "@cookto/engine";
import {
  finishOnboarding,
  skipOnboarding,
  startHousehold,
} from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { household, membersQuery, queries, settings } from "../../platform.js";
import { go, goHome, type Step } from "../../routes.js";

// What each onboarding step shows around its own part: its title and words,
// where it is in the steps, and the actions at the bottom (ADR 0022).

const deps = { household, settings: settings.writer };
const NUMBERS = { where: 1, who: 2 } as const;
const TOTAL = 2;

export function useOnboardingScreen(step: Step) {
  const { locale, t } = useWords();
  const { data: people = 0 } = useQuery(
    { ...membersQuery, select: (members) => members.length },
    queries,
  );
  const { data: meals = 0 } = useQuery(
    { ...membersQuery, select: (members) => plannedSlots(members).length },
    queries,
  );
  const number = step === "done" ? null : NUMBERS[step];
  const words = {
    where: { title: t.whereTitle, body: t.whereBody },
    who: { title: t.whoTitle, body: t.whoBody },
    done: {
      title: t.allSet,
      body: fill(t.plan, {
        meals: count(locale, t.mealCount, meals),
        people: count(locale, t.peopleCount, people),
      }),
    },
  }[step];
  return {
    ...words,
    steps:
      number === null
        ? null
        : {
            current: number,
            total: TOTAL,
            label: fill(t.stepOf, { n: number, total: TOTAL }),
          },
    /** Who eats needs someone in it (criterion 3). */
    canGoOn: step !== "who" || people > 0,
    nextLabel: step === "done" ? t.goToKitchen : t.next,
    backLabel: t.back,
    skipLabel: t.skip,
    next: () => {
      if (step === "where")
        void startHousehold(deps).then(() => {
          go("who");
        });
      else if (step === "who") go("done");
      else
        void finishOnboarding(deps).then((done) => {
          if (done) goHome();
        });
    },
    back:
      step === "where"
        ? null
        : () => {
            go(step === "done" ? "who" : "where");
          },
    skip: step === "who" ? () => void skipOnboarding(deps).then(goHome) : null,
  };
}
