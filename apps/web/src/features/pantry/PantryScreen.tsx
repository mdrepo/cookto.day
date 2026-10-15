import type { ReactNode } from "react";
import {
  Button,
  ItemList,
  Panes,
  Screen,
  Section,
  Stack,
  Tag,
  UndoBar,
} from "@cookto/ui";
import { AddFood } from "./AddFood.js";
import { ItemSheet } from "./ItemSheet.js";
import { ListButton } from "./ListButton.js";
import { SetUpSteps } from "./SetUpSteps.js";
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
          <Button
            kind={s.guiding ? "quiet" : "main"}
            icon="plus"
            onClick={s.add.start}
          >
            {s.add.label}
          </Button>
        )
      }
    >
      <ListButton />
      <SetUpSteps setup={s.setup} shown={s.guiding} />
      {s.add.adding && <AddFood onDone={s.add.done} />}
      <Panes
        primary={
          <Stack gap={4}>
            {s.groups.filter((g) => g.key !== "soon").map(group)}
          </Stack>
        }
        secondary={s.groups.filter((g) => g.key === "soon").map(group)}
      />
      {s.undo && (
        <UndoBar undoLabel={s.undo.label} onUndo={s.undo.run}>
          {s.undo.text}
        </UndoBar>
      )}
      {s.open && (
        <ItemSheet id={s.open} onClose={s.close} onUsedUp={s.onUsedUp} />
      )}
    </Screen>
  );
}
