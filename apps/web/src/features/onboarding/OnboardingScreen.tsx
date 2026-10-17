import { ActionBar, Button, Screen, Steps } from "@cookto/ui";
import { lazy, type ReactNode, Suspense } from "react";
import type { Step } from "../../routes.js";
import { useOnboardingScreen } from "./useOnboardingScreen.js";
import { WhereStep } from "./WhereStep.js";

// A first visit opens on "where": the later steps load when they're needed,
// to keep a first visit's scripts small (ADR 0018).
const WhoStep = lazy(() =>
  import("./WhoStep.js").then((m) => ({ default: m.WhoStep })),
);
const DoneStep = lazy(() =>
  import("./DoneStep.js").then((m) => ({ default: m.DoneStep })),
);

/** Where you live, then who eats which meals, then all set (specs/65). */
export function OnboardingScreen({
  step,
  language,
}: {
  step: Step;
  /** The language list, on the first step only (#84). */
  language: ReactNode;
}) {
  const s = useOnboardingScreen(step);
  return (
    <Screen
      title={s.title}
      tagline={s.body}
      header={
        <>
          {s.steps && <Steps {...s.steps} />}
          {language}
        </>
      }
    >
      {step === "where" && <WhereStep />}
      <Suspense fallback={null}>
        {step === "who" && <WhoStep />}
        {step === "done" && <DoneStep />}
      </Suspense>
      <ActionBar
        below={
          s.skip && (
            <Button kind="plain" onClick={s.skip}>
              {s.skipLabel}
            </Button>
          )
        }
      >
        {s.back && (
          <Button kind="quiet" onClick={s.back}>
            {s.backLabel}
          </Button>
        )}
        <Button disabled={!s.canGoOn} onClick={s.next}>
          {s.nextLabel}
        </Button>
      </ActionBar>
    </Screen>
  );
}
