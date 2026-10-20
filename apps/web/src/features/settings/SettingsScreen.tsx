import type { ReactNode } from "react";
import { Button, Cluster, Screen, Stack } from "@cookto/ui";
import { useWords } from "../../i18n/useWords.js";
import { goHome } from "../../routes.js";
import { BeansPicker } from "./BeansPicker.js";
import { CookLink } from "./CookLink.js";
import { LanguagePicker } from "./LanguagePicker.js";
import { RolePicker } from "./RolePicker.js";
import { SignIn } from "./SignIn.js";
import { ThemePicker } from "./ThemePicker.js";

/**
 * Settings, under More: sign in with Telegram (#216), the language (#84),
 * who cooks (#195) and, on a planner's phone, the cook's Telegram (#207),
 * the theme (#96) and the beans (#144).
 */
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
        <SignIn />
        <LanguagePicker />
        <RolePicker />
        <CookLink />
        <ThemePicker />
        <BeansPicker />
      </Stack>
    </Screen>
  );
}
