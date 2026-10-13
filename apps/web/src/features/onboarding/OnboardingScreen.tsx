import { ActionBar, Button, Screen, Steps } from "@cookto/ui";
import type { ReactNode } from "react";
import type { Step } from "../../routes.js";
import { DoneStep } from "./DoneStep.js";
import { useOnboardingScreen } from "./useOnboardingScreen.js";
import { WhereStep } from "./WhereStep.js";
import { WhoStep } from "./WhoStep.js";

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
      {step === "who" && <WhoStep />}
      {step === "done" && <DoneStep />}
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
