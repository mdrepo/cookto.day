import { EmptyState, NextSteps, Section, Stack } from "@cookto/ui";
import { useWords } from "../../i18n/useWords.js";
import type { useKitchenSetup } from "../../setup.js";

/**
 * Until there's fresh food, the Fridge shows how to set the kitchen up, the
 * next step as its main button (#115). Hidden while "Add food" is open.
 */
export function SetUpSteps({
  setup: s,
  shown,
}: {
  setup: ReturnType<typeof useKitchenSetup>;
  shown: boolean;
}) {
  const { t } = useWords();
  if (!shown) return null;
  return (
    <Stack gap={4}>
      {s.empty && (
        <EmptyState title={t.nothingHereYet}>{t.setUpBody}</EmptyState>
      )}
      <Section title={s.label}>
        <NextSteps label={s.label} doneLabel={s.doneLabel} steps={s.steps} />
      </Section>
    </Stack>
  );
}
