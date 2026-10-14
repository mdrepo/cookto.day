import type { ReactNode } from "react";
import { Button, Cluster, ItemList, Screen, Section } from "@cookto/ui";
import { useDishesScreen } from "./useDishesScreen.js";

/**
 * A cuisine's dishes, and whether the pantry has what each needs (criterion
 * 10): the ones you can cook now first (#97); each opens its page (#95).
 */
export function DishesScreen({ bar }: { bar: ReactNode }) {
  const s = useDishesScreen();
  return (
    <Screen bar={bar} title={s.title}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
          {s.back}
        </Button>
      </Cluster>
      {[s.ready, s.rest].map(
        (group) =>
          group.items.length > 0 && (
            <Section key={group.title} title={group.title}>
              <ItemList label={group.title} items={group.items} />
            </Section>
          ),
      )}
    </Screen>
  );
}
