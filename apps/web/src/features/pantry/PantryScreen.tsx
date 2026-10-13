import { ActionBar, Button, Cluster, Rows, Screen, Stack } from "@cookto/ui";
import { type ReactNode, useId } from "react";
import { AddFood } from "./AddFood.js";
import { PantryItem } from "./PantryItem.js";
import { usePantryScreen } from "./usePantryScreen.js";

/** What's in the kitchen (specs/72, criteria 2 to 5). */
export function PantryScreen({ header }: { header: ReactNode }) {
  const s = usePantryScreen();
  const freshId = useId();
  const staplesId = useId();
  return (
    <Screen title={s.title} header={header}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
          {s.back}
        </Button>
      </Cluster>
      {s.add.adding && <AddFood onDone={s.add.done} />}
      {s.fresh.length > 0 && (
        <section aria-labelledby={freshId}>
          <Stack gap={3}>
            <h2 id={freshId}>{s.freshTitle}</h2>
            {s.fresh.map((id) => (
              <PantryItem key={id} id={id} />
            ))}
          </Stack>
        </section>
      )}
      {s.staples.length > 0 && (
        <section aria-labelledby={staplesId}>
          <Stack gap={3}>
            <h2 id={staplesId}>{s.staplesTitle}</h2>
            <Rows label={s.staplesTitle} rows={s.staples} />
          </Stack>
        </section>
      )}
      {!s.add.adding && (
        <ActionBar>
          <Button icon="plus" onClick={s.add.start}>
            {s.add.label}
          </Button>
        </ActionBar>
      )}
    </Screen>
  );
}
