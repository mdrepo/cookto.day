import type { ReactNode } from "react";
import { Button, Cluster, Note, Panes, Screen } from "@cookto/ui";
import { openSettings } from "../../routes.js";
import { CookNow } from "./CookNow.js";
import { CookToday } from "./CookToday.js";
import { useHomeScreen } from "./useHomeScreen.js";
import { KitchenCards, KitchenMore } from "./KitchenStart.js";
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
      action={
        <Button
          kind="plain"
          icon="settings"
          label={t.settings}
          onClick={openSettings}
        />
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
      <CookNow />
      <Panes
        primary={<CookToday />}
        secondary={<UseSoon sheet={itemSheet} />}
      />
      <KitchenMore />
      <Note>{t.privacy}</Note>
    </Screen>
  );
}
