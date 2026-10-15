import type { ReactNode } from "react";
import {
  Button,
  Cluster,
  LinkOut,
  Panes,
  Reasons,
  Rows,
  Screen,
  Section,
  Stack,
} from "@cookto/ui";
import { useDishScreen } from "./useDishScreen.js";

type Dish = NonNullable<ReturnType<typeof useDishScreen>>;

/** Why, what to do, and the recipe: beside the lists on a wide screen. */
function DishSide({ s }: { s: Dish }) {
  return (
    <Stack gap={3}>
      <Reasons
        items={[
          ...s.reasons,
          ...(s.cookedToday
            ? [
                {
                  key: "cooked",
                  text: s.cookedToday,
                  tone: "good" as const,
                },
              ]
            : []),
        ]}
      />
      {s.cookedToday && (
        <div>
          <Button kind="plain" onClick={s.onUndo}>
            {s.undo}
          </Button>
        </div>
      )}
      {!s.cookedToday && (
        <div>
          <Button kind="quiet" icon="check" onClick={s.onCooked}>
            {s.weCookedThis}
          </Button>
        </div>
      )}
      {s.addToList && (
        <div>
          <Button kind="quiet" icon="shopping-cart" onClick={s.addToList.run}>
            {s.addToList.label}
          </Button>
        </div>
      )}
      {s.addToList?.added && (
        <Reasons
          items={[{ key: "added", text: s.addToList.added, tone: "good" }]}
        />
      )}
      {s.source && <LinkOut href={s.source}>{s.seeRecipe}</LinkOut>}
    </Stack>
  );
}

/**
 * A dish's page (specs/95): on a phone, why and the recipe first, then what
 * you need and have; on a wide screen, those lists beside them.
 */
export function DishScreen({ bar }: { bar: ReactNode }) {
  const s = useDishScreen();
  if (!s)
    return (
      <Screen bar={bar} title="">
        {null}
      </Screen>
    );
  return (
    <Screen
      bar={bar}
      title={s.title}
      header={
        <Cluster>
          <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
            {s.back}
          </Button>
        </Cluster>
      }
    >
      <Panes
        primary={
          <Stack gap={6}>
            {s.need.length > 0 && (
              <Section title={s.youNeed}>
                <Rows label={s.youNeed} rows={s.need} />
              </Section>
            )}
            <Section title={s.youHave}>
              <Rows label={s.youHave} rows={s.have} />
            </Section>
          </Stack>
        }
        secondary={<DishSide s={s} />}
      />
    </Screen>
  );
}
