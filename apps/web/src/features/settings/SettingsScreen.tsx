import { Button, Cluster, Screen } from "@cookto/ui";
import { useWords } from "../../i18n/useWords.js";
import { goHome } from "../../routes.js";
import { LanguagePicker } from "./LanguagePicker.js";

/** Settings, behind the gear on Today: the language, for now (#84). */
export function SettingsScreen() {
  const { t } = useWords();
  return (
    <Screen
      title={t.settings}
      header={
        <Cluster>
          <Button kind="plain" icon="arrow-left" onClick={goHome}>
            {t.back}
          </Button>
        </Cluster>
      }
    >
      <LanguagePicker />
    </Screen>
  );
}
