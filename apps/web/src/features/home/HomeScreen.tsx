import { Button, Callout, Cluster, Logo, Note, Screen } from "@cookto/ui";
import { openSettings } from "../../routes.js";
import { CookToday } from "./CookToday.js";
import { useHomeScreen } from "./useHomeScreen.js";
import { useKitchenStart } from "./useKitchenStart.js";
import { UseSoon } from "./UseSoon.js";

/** Today: the household, the kitchen, and what to cook (specs/72, 80; #84). */
export function HomeScreen() {
  const t = useHomeScreen();
  const k = useKitchenStart();
  const choose = (kind: "main" | "quiet") => (
    <Button kind={kind} onClick={k.choose.onClick}>
      {k.choose.label}
    </Button>
  );
  const trySample = k.trySample && (
    <Button kind="quiet" onClick={k.trySample.onClick}>
      {k.trySample.label}
    </Button>
  );
  return (
    <Screen
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
      {k.sample && (
        <Callout
          title={k.sample.tag}
          art={<Logo />}
          actions={
            <>
              {choose("main")}
              <Button kind="quiet" onClick={k.sample.onClear}>
                {k.sample.clear}
              </Button>
            </>
          }
        >
          {k.sample.body}
        </Callout>
      )}
      {k.empty && (
        <Callout
          title={t.emptyTitle}
          art={<Logo />}
          actions={
            <>
              {choose("main")}
              {trySample}
            </>
          }
        >
          {t.emptyBody}
        </Callout>
      )}
      <UseSoon />
      <CookToday />
      {!k.empty && !k.sample && (
        <Cluster gap={2}>
          {choose("quiet")}
          {trySample}
        </Cluster>
      )}
      <Note>{t.privacy}</Note>
    </Screen>
  );
}
