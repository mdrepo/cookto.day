import type { ReactNode } from "react";
import {
  ActionBar,
  Button,
  Card,
  Chip,
  Cluster,
  Screen,
  Stack,
} from "@cookto/ui";
import { useStaplesScreen } from "./useStaplesScreen.js";

/** The usual staples, ticked for you (specs/72, criterion 2). */
export function StaplesScreen({ bar }: { bar: ReactNode }) {
  const s = useStaplesScreen();
  return (
    <Screen bar={bar} title={s.title}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.onBack}>
          {s.back}
        </Button>
      </Cluster>
      <Stack gap={3}>
        {s.groups.map((g) => (
          <Card key={g.group} title={g.title} level={2}>
            <Cluster>
              {g.staples.map((x) => (
                <Chip key={x.id} pressed={x.pressed} onClick={x.toggle}>
                  {x.label}
                </Chip>
              ))}
            </Cluster>
          </Card>
        ))}
      </Stack>
      <ActionBar>
        <Button disabled={!s.canAdd} onClick={() => void s.add()}>
          {s.addLabel}
        </Button>
      </ActionBar>
    </Screen>
  );
}
