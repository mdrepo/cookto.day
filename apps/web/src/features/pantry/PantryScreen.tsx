import { Button, Cluster, ItemList, Screen, Stack, Tag } from "@cookto/ui";
import type { ReactNode } from "react";
import { AddFood } from "./AddFood.js";
import { ItemSheet } from "./ItemSheet.js";
import { usePantryScreen } from "./usePantryScreen.js";

/** What's in the kitchen, as a short list you tap (specs/72, 80). */
export function PantryScreen({ header }: { header: ReactNode }) {
  const s = usePantryScreen();
  return (
    <Screen title={s.title} header={header}>
      {s.add.adding ? (
        <AddFood onDone={s.add.done} />
      ) : (
        <Cluster>
          <Button icon="plus" onClick={s.add.start}>
            {s.add.label}
          </Button>
        </Cluster>
      )}
      {s.groups.map((g) => (
        <Stack key={g.key} gap={2}>
          <h2>{g.label}</h2>
          <ItemList
            label={g.label}
            items={g.rows.map((r) => ({
              key: r.key,
              name: r.name,
              ...(r.line ? { line: r.line } : {}),
              end: r.warn ? <Tag tone="warn">{r.end}</Tag> : r.end,
              onOpen: r.onOpen,
            }))}
          />
        </Stack>
      ))}
      {s.open && <ItemSheet id={s.open} onClose={s.close} />}
    </Screen>
  );
}
