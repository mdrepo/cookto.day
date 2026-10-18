import type { ReactNode } from "react";
import {
  Button,
  Cluster,
  Note,
  Panes,
  Screen,
  Stack,
  UndoBar,
} from "@cookto/ui";
import { CookNow } from "./CookNow.js";
import { CookToday } from "./CookToday.js";
import { useHomeScreen } from "./useHomeScreen.js";
import { KitchenCards, KitchenMore } from "./KitchenStart.js";
import { PrepNotes } from "./PrepNotes.js";
import { Tomorrow } from "./Tomorrow.js";
import { type ItemSheetFor, UseSoon } from "./UseSoon.js";

/** Today: the household, the kitchen, and what to cook (specs/72, 80; #84). */
export function HomeScreen({
  bar,
  itemSheet,
}: {
  bar: ReactNode;
  /** The fridge's sheet for one item, for "Use soon" (#105). */
  itemSheet: ItemSheetFor;
}) {
  const t = useHomeScreen();
  return (
    <Screen
      bar={bar}
      title="cookto.day"
      eyebrow={t.date}
      note={
        t.usedUp.note && (
          <UndoBar undoLabel={t.usedUp.note.label} onUndo={t.usedUp.note.run}>
            {t.usedUp.note.text}
          </UndoBar>
        )
      }
    >
      {t.household && (
        <Cluster gap={2}>
          <span>{t.household.line}</span>
          <Button kind="plain" onClick={t.household.onEdit}>
            {t.household.edit}
          </Button>
        </Cluster>
      )}
      <KitchenCards />
      <PrepNotes />
      <CookNow />
      <Panes
        primary={
          <Stack gap={6}>
            <CookToday />
            <Tomorrow />
          </Stack>
        }
        secondary={
          <UseSoon
            sheet={itemSheet}
            onOpen={t.usedUp.clear}
            onUsedUp={t.usedUp.onUsedUp}
          />
        }
      />
      <KitchenMore />
      <Note>{t.privacy}</Note>
    </Screen>
  );
}
