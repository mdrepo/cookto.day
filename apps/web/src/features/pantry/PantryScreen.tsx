import type { ReactNode } from "react";
import {
  Button,
  ItemList,
  Panes,
  Screen,
  Section,
  Stack,
  Tag,
} from "@cookto/ui";
import { AddFood } from "./AddFood.js";
import { ItemSheet } from "./ItemSheet.js";
import { ListButton } from "./ListButton.js";
import { usePantryScreen } from "./usePantryScreen.js";

/** What's in the kitchen, as a short list you tap (specs/72, 80; #84). */
export function PantryScreen({ bar }: { bar: ReactNode }) {
  const s = usePantryScreen();
  const group = (g: (typeof s.groups)[number]) => (
    <Section
      key={g.key}
      title={g.label}
      {...(g.key === "soon" ? { tone: "warn" as const } : {})}
    >
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
    </Section>
  );
  return (
    <Screen
      bar={bar}
      title={s.title}
      action={
        !s.add.adding && (
          <Button icon="plus" onClick={s.add.start}>
            {s.add.label}
          </Button>
        )
      }
    >
      <ListButton />
      {s.add.adding && <AddFood onDone={s.add.done} />}
      <Panes
        primary={
          <Stack gap={4}>
            {s.groups.filter((g) => g.key !== "soon").map(group)}
          </Stack>
        }
        secondary={s.groups.filter((g) => g.key === "soon").map(group)}
      />
      {s.open && <ItemSheet id={s.open} onClose={s.close} />}
    </Screen>
  );
}
