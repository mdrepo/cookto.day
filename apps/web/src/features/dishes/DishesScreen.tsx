import type { ReactNode } from "react";
import { Button, Cluster, Rows, Screen } from "@cookto/ui";
import { useDishesScreen } from "./useDishesScreen.js";

/** A cuisine's dishes, and whether the pantry has what each needs (criterion 10). */
export function DishesScreen({ bar }: { bar: ReactNode }) {
  const s = useDishesScreen();
  return (
    <Screen bar={bar} title={s.title}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
          {s.back}
        </Button>
      </Cluster>
      <Rows label={s.title} rows={s.rows} />
    </Screen>
  );
}
