import { Button, Cluster, EmptyState, Note, Screen, Tag } from "@cookto/ui";
import type { ReactNode } from "react";
import { CookToday } from "./CookToday.js";
import { useHomeScreen } from "./useHomeScreen.js";
import { useKitchenStart } from "./useKitchenStart.js";
import { UseSoon } from "./UseSoon.js";

/** The first page: the household, the kitchen, and what to cook today. */
export function HomeScreen({ header }: { header: ReactNode }) {
  const t = useHomeScreen();
  const k = useKitchenStart();
  return (
    <Screen title="cookto.day" tagline={t.tagline} header={header}>
      {t.household && (
        <Cluster gap={2}>
          <span>{t.household.line}</span>
          <Button kind="plain" onClick={t.household.onEdit}>
            {t.household.edit}
          </Button>
        </Cluster>
      )}
      {k.sample && (
        <Cluster gap={2}>
          <Tag>{k.sample.tag}</Tag>
          <Button kind="plain" onClick={k.sample.onClear}>
            {k.sample.clear}
          </Button>
        </Cluster>
      )}
      {k.empty && (
        <>
          <EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
          <Note>{t.privacy}</Note>
        </>
      )}
      <Cluster gap={2}>
        <Button kind={k.empty ? "main" : "quiet"} onClick={k.choose.onClick}>
          {k.choose.label}
        </Button>
        {k.trySample && (
          <Button kind="quiet" onClick={k.trySample.onClick}>
            {k.trySample.label}
          </Button>
        )}
      </Cluster>
      <UseSoon />
      <CookToday />
      {!k.empty && <Note>{t.privacy}</Note>}
    </Screen>
  );
}
