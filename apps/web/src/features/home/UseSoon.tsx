import type { ReactNode } from "react";
import { useState } from "react";
import { ItemList, Section, Tag } from "@cookto/ui";
import { useUseSoon } from "./useUseSoon.js";

/** Opens one item's sheet: the fridge's, handed in by the app (#105). */
export type ItemSheetFor = (
  id: string,
  onClose: () => void,
  onUsedUp: (id: string, name: string) => void,
) => ReactNode;

/**
 * Food that needs using, at the top of Today (the prototype's "Use soon").
 * A row opens its sheet here, with the dishes that use it (#105).
 */
export function UseSoon({
  sheet,
  onOpen,
  onUsedUp,
}: {
  sheet: ItemSheetFor;
  /** A row opened: an earlier note goes (#116). */
  onOpen: () => void;
  /** Food used up from its sheet, for its Undo (#116). */
  onUsedUp: (id: string, name: string) => void;
}) {
  const u = useUseSoon();
  const [open, setOpen] = useState<string | null>(null);
  if (u.rows.length === 0) return null;
  return (
    <Section title={u.title} tone="warn">
      <ItemList
        label={u.title}
        items={u.rows.map((r) => ({
          key: r.key,
          name: r.name,
          line: r.line,
          end: <Tag tone="warn">{r.warning}</Tag>,
          onOpen: () => {
            onOpen();
            setOpen(r.key);
          },
        }))}
      />
      {open &&
        sheet(
          open,
          () => {
            setOpen(null);
          },
          onUsedUp,
        )}
    </Section>
  );
}
