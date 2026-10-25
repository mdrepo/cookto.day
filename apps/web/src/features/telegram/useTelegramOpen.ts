import { useEffect, useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import { api, householdSync, now, settings } from "../../platform.js";

// Tomorrow, opened by "Change" in the bot (specs/241): Telegram's window
// shares nothing with the phone's app, so the page signs in with the proof
// Telegram put after its #, joins the household, pulls it, and shows Today
// with Tomorrow. A proof the API refuses shows only "Open this from the app."

/** The init data Telegram hands a page it opens, from after the #. */
const proof = () =>
  new URLSearchParams(location.hash.slice(1)).get("tgWebAppData") ?? "";

export function useTelegramOpen() {
  const { t } = useWords();
  const [refused, setRefused] = useState(false);
  useEffect(() => {
    void Promise.all([
      api(),
      import("@cookto/usecases/signin"),
      import("@cookto/usecases/household-sync"),
    ]).then(async ([a, signin, household]) => {
      const signedIn = await signin.signInFromTelegram(
        { api: a, settings: settings.writer },
        proof(),
        now().toISOString(),
      );
      if (!signedIn) {
        setRefused(true);
        return;
      }
      await household.joinOrStart(await householdSync());
      // Today, with the proof gone from the address.
      history.replaceState(null, "", "/#/");
      dispatchEvent(new HashChangeEvent("hashchange"));
    });
  }, []);
  return { title: t.tomorrow, message: refused ? t.openFromApp : null };
}
