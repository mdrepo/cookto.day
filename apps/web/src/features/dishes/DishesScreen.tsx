import type { ReactNode } from "react";
import {
  Button,
  Cluster,
  EmptyState,
  ItemList,
  Photo,
  Screen,
  Section,
  Stack,
} from "@cookto/ui";
import { useDishesScreen } from "./useDishesScreen.js";

/**
 * My dishes, and whether the pantry has what each needs (criterion 10): the
 * ones you can cook now first (#97), the child's own last (specs/175); each
 * opens its page (#95).
 */
export function DishesScreen({ bar }: { bar: ReactNode }) {
  const s = useDishesScreen();
  return (
    <Screen bar={bar} title={s.title}>
      {s.back && (
        <Cluster>
          <Button kind="plain" icon="arrow-left" onClick={s.back.run}>
            {s.back.label}
          </Button>
        </Cluster>
      )}
      {s.none && (
        <Stack gap={3}>
          <EmptyState title={s.none.title}>{s.none.body}</EmptyState>
          <Cluster>
            <Button onClick={s.none.choose}>{s.none.chooseLabel}</Button>
          </Cluster>
        </Stack>
      )}
      {s.groups.map(
        (group) =>
          group.items.length > 0 && (
            <Section key={group.title} title={group.title}>
              <ItemList
                label={group.title}
                items={group.items.map(({ photo, ...item }) => ({
                  ...item,
                  // The name beside it says what it is.
                  media: <Photo src={photo} alt="" shape="square" />,
                }))}
              />
            </Section>
          ),
      )}
    </Screen>
  );
}
