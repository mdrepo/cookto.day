import type { ReactNode } from "react";
import {
  Button,
  Cluster,
  LinkOut,
  Method,
  Panes,
  Photo,
  Reasons,
  Rows,
  Screen,
  Section,
  Stack,
} from "@cookto/ui";
import { useDishScreen } from "./useDishScreen.js";

type Dish = NonNullable<ReturnType<typeof useDishScreen>>;

/** Why, and what to do: beside the lists on a wide screen. */
function DishSide({ s }: { s: Dish }) {
  return (
    <Stack gap={3}>
      <Photo src={s.photo?.src} alt={s.title} shape="wide" eager />
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
      {s.planned && (
        <Cluster gap={2}>
          <Reasons
            items={[{ key: "planned", text: s.planned.text, tone: "quiet" }]}
          />
          <Button kind="plain" onClick={s.planned.run}>
            {s.planned.label}
          </Button>
        </Cluster>
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
      {s.photo && <LinkOut href={s.photo.source}>{s.photo.credit}</LinkOut>}
    </Stack>
  );
}

/**
 * A dish's page (specs/95, 149): on a phone, why first, then what you need
 * and have, the steps and a full version's link; on a wide screen, the
 * lists and steps beside why.
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
            {s.prep.length > 0 && (
              <Section title={s.prepTitle}>
                <Reasons
                  items={s.prep.map((line) => ({
                    key: line,
                    text: line,
                    tone: "warm" as const,
                  }))}
                />
              </Section>
            )}
            {s.need.length > 0 && (
              <Section title={s.youNeed}>
                <Rows label={s.youNeed} rows={s.need} />
              </Section>
            )}
            <Section title={s.youHave}>
              <Rows label={s.youHave} rows={s.have} />
            </Section>
            {s.steps.length > 0 && (
              <Section title={s.stepsTitle}>
                <Method label={s.stepsTitle} steps={s.steps} />
              </Section>
            )}
            {s.source && <LinkOut href={s.source}>{s.seeFullVersion}</LinkOut>}
          </Stack>
        }
        secondary={<DishSide s={s} />}
      />
    </Screen>
  );
}
