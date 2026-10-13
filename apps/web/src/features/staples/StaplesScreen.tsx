import {
  ActionBar,
  Button,
  Card,
  Chip,
  Cluster,
  Screen,
  Stack,
} from "@cookto/ui";
import type { ReactNode } from "react";
import { useStaplesScreen } from "./useStaplesScreen.js";

/** The usual staples, ticked for you (specs/72, criterion 2). */
export function StaplesScreen({ header }: { header: ReactNode }) {
  const s = useStaplesScreen();
  return (
    <Screen title={s.title} header={header}>
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
