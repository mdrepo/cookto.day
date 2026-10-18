import type { ReactNode } from "react";
import { Button, Cluster, ItemList, Screen, Tag } from "@cookto/ui";
import { usePackScreen } from "./usePackScreen.js";

/** A pack's dishes, to pick for My dishes (specs/175, criteria 2 and 3). */
export function PackScreen({ bar }: { bar: ReactNode }) {
  const s = usePackScreen();
  return (
    <Screen bar={bar} title={s.title}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.back.run}>
          {s.back.label}
        </Button>
      </Cluster>
      <ItemList
        label={s.listLabel}
        items={s.items.map(({ mine, ...item }) => ({
          ...item,
          end: mine ? <Tag>{s.inMyDishes}</Tag> : undefined,
        }))}
      />
    </Screen>
  );
}
