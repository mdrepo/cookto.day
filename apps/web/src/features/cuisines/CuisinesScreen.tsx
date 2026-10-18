import type { ReactNode } from "react";
import {
  ActionBar,
  Button,
  Card,
  Chip,
  Cluster,
  Screen,
  Stack,
  Tag,
} from "@cookto/ui";
import { useCuisinesScreen } from "./useCuisinesScreen.js";

/** Choose what you cook: load a cuisine's dishes (specs/72, criteria 1, 8). */
export function CuisinesScreen({ bar }: { bar: ReactNode }) {
  const s = useCuisinesScreen();
  return (
    <Screen bar={bar} title={s.title}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
          {s.back}
        </Button>
      </Cluster>
      <Stack gap={3}>
        {s.cuisines.map((c) => (
          <Card key={c.id} title={c.name}>
            <Cluster gap={3}>
              {c.dishes && (
                <Button kind="plain" onClick={c.open}>
                  {c.dishes}
                </Button>
              )}
              {c.soon && <Tag tone="outline">{c.soon}</Tag>}
              {c.loaded && <Tag>{c.loaded}</Tag>}
              {!c.soon && !c.loaded && (
                <Button kind="quiet" onClick={c.load}>
                  {c.loadLabel}
                </Button>
              )}
            </Cluster>
          </Card>
        ))}
      </Stack>
      {s.parts.length > 0 && (
        <Card title={s.skipTitle} level={2}>
          <Cluster>
            {s.parts.map((p) => (
              <Chip key={p.part} pressed={p.pressed} onClick={p.toggle}>
                {p.label}
              </Chip>
            ))}
          </Cluster>
        </Card>
      )}
      {s.staples && (
        <ActionBar>
          <Button onClick={s.staples.onClick}>{s.staples.label}</Button>
        </ActionBar>
      )}
    </Screen>
  );
}
