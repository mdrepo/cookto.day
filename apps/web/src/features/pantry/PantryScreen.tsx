import type { ReactNode } from "react";
import { Button, ItemList, Screen, Section, Tag } from "@cookto/ui";
import { AddFood } from "./AddFood.js";
import { ItemSheet } from "./ItemSheet.js";
import { usePantryScreen } from "./usePantryScreen.js";

/** What's in the kitchen, as a short list you tap (specs/72, 80; #84). */
export function PantryScreen({ bar }: { bar: ReactNode }) {
  const s = usePantryScreen();
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
      {s.add.adding && <AddFood onDone={s.add.done} />}
      {s.groups.map((g) => (
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
      ))}
      {s.open && <ItemSheet id={s.open} onClose={s.close} />}
    </Screen>
  );
}
