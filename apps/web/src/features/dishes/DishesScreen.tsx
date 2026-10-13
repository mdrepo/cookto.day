import { Button, Cluster, Rows, Screen } from "@cookto/ui";
import type { ReactNode } from "react";
import { useDishesScreen } from "./useDishesScreen.js";

/** A cuisine's dishes, and whether the pantry has what each needs (criterion 10). */
export function DishesScreen({ header }: { header: ReactNode }) {
  const s = useDishesScreen();
  return (
    <Screen title={s.title} header={header}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
          {s.back}
        </Button>
      </Cluster>
      <Rows label={s.title} rows={s.rows} />
    </Screen>
  );
}
