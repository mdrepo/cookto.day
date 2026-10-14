import type { ReactNode } from "react";
import { Button, Cluster, Screen, Stack } from "@cookto/ui";
import { useWords } from "../../i18n/useWords.js";
import { goHome } from "../../routes.js";
import { LanguagePicker } from "./LanguagePicker.js";
import { ThemePicker } from "./ThemePicker.js";

/** Settings, behind the gear on Today: the language (#84) and the theme (#96). */
export function SettingsScreen({ bar }: { bar: ReactNode }) {
  const { t } = useWords();
  return (
    <Screen
      bar={bar}
      title={t.settings}
      header={
        <Cluster>
          <Button kind="plain" icon="arrow-left" onClick={goHome}>
            {t.back}
          </Button>
        </Cluster>
      }
    >
      <Stack gap={4}>
        <LanguagePicker />
        <ThemePicker />
      </Stack>
    </Screen>
  );
}
