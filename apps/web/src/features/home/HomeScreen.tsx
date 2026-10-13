import { Button, Cluster, EmptyState, Note, Screen } from "@cookto/ui";
import type { ReactNode } from "react";
import { useHomeScreen } from "./useHomeScreen.js";

/** The first page: what to do while the kitchen is empty. */
export function HomeScreen({ header }: { header: ReactNode }) {
  const t = useHomeScreen();
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
      <EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
      <Note>{t.privacy}</Note>
    </Screen>
  );
}
