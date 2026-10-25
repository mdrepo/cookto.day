import { plannedSlots } from "@cookto/engine";
import {
  finishOnboarding,
  skipOnboarding,
  startHousehold,
} from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  household,
  householdSync,
  membersQuery,
  queries,
  settings,
} from "../../platform.js";
import { go, goHome, openInviteCook, type Step } from "../../routes.js";

// What each onboarding step shows around its own part: its title and words,
// where it is in the steps, and the actions at the bottom (ADR 0022).

const deps = { household, settings: settings.writer };
/** The steps in order; "done" isn't counted (specs/65, 195, 263). */
const ORDER = ["where", "who", "cuisines", "cooks", "done"] as const;
const TOTAL = ORDER.length - 1;

export function useOnboardingScreen(step: Step) {
  const { locale, t } = useWords();
  const cuisines = useStore(settings.store, (s) => s.kitchen.cuisines.length);
  const { data: people = 0 } = useQuery(
    { ...membersQuery, select: (members) => members.length },
    queries,
  );
  const { data: meals = 0 } = useQuery(
    { ...membersQuery, select: (members) => plannedSlots(members).length },
    queries,
  );
  const at = ORDER.indexOf(step);
  const number = step === "done" ? null : at + 1;
  const words = {
    where: { title: t.whereTitle, body: t.whereBody },
    who: { title: t.whoTitle, body: t.whoBody },
    cuisines: { title: t.whatDoYouCook, body: t.whatDoYouCookBody },
    cooks: { title: t.whoCooks, body: t.whoCooksBody },
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
    /** Who eats needs someone in it; what you cook, a cuisine (specs/263). */
    canGoOn:
      step === "who" ? people > 0 : step === "cuisines" ? cuisines > 0 : true,
    nextLabel: step === "done" ? t.goToKitchen : t.next,
    backLabel: t.back,
    skipLabel: t.skip,
    next: () => {
      const after = ORDER[at + 1];
      if (step === "where")
        void startHousehold(deps).then(() => {
          go("who");
        });
      else if (after) go(after);
      else
        void finishOnboarding(deps).then((done) => {
          if (done) void onward();
        });
    },
    back:
      at === 0
        ? null
        : () => {
            go(ORDER[at - 1] ?? "where");
          },
    skip:
      step === "who" || step === "cuisines"
        ? () => void skipOnboarding(deps).then(onward)
        : null,
  };
}

/**
 * Home, once setup's done; a signed-in phone (inside Telegram, specs/260)
 * starts its household first, and goes on to the cook's invite when
 * someone else cooks.
 */
async function onward(): Promise<void> {
  const { signedIn, role } = settings.store.getState();
  const next =
    signedIn === null
      ? "home"
      : await import("@cookto/usecases/household-sync").then((m) =>
          m.afterSetup(householdSync, { signedIn: true, role }),
        );
  if (next === "invite") openInviteCook();
  else goHome();
}
