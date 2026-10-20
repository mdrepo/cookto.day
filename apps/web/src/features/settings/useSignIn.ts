import type { LinkMade } from "@cookto/data";
import {
  checkSignedIn,
  signInConnected,
  signOut,
  startSignIn,
} from "@cookto/usecases/signin";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { api, now, settings } from "../../platform.js";
import { BOT, spaced } from "./useCookLink.js";

// Sign in with Telegram (specs/216), on any phone: one line about what's
// kept, then a code and the bot's link, polled every 3 seconds until Start
// happened, or the code ran out. Signed in, the name and "Sign out".

const POLL_MS = 3_000;

type Step =
  | { kind: "idle" }
  | { kind: "explain" }
  | { kind: "code"; made: LinkMade }
  | { kind: "expired" };

const deps = async () => ({ api: await api(), settings: settings.writer });

/** Signed in when Settings opens: does the session still work? Once. */
function useSessionCheck(signedIn: boolean, onSignedOut: () => void) {
  const checked = useRef(false);
  useEffect(() => {
    if (!signedIn || checked.current) return;
    checked.current = true;
    void deps()
      .then((d) => checkSignedIn(d, now().toISOString()))
      .then((state) => {
        if (state === "signed-out") onSignedOut();
      });
  }, [signedIn, onSignedOut]);
}

/** While the code shows, ask every few seconds whether Start happened. */
function useStartPoll(made: LinkMade | null, setStep: (step: Step) => void) {
  useEffect(() => {
    if (made === null) return;
    let stop = false;
    const tick = async () => {
      const state = await deps()
        .then((d) => signInConnected(d, made, now().toISOString()))
        .catch(() => "waiting" as const);
      if (stop) return;
      if (state === "signed-in") setStep({ kind: "idle" });
      else if (state === "expired") setStep({ kind: "expired" });
    };
    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [made, setStep]);
}

export function useSignIn() {
  const { t } = useWords();
  const signedIn = useStore(settings.store, (s) => s.signedIn);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [signedOutElsewhere, setSignedOutElsewhere] = useState(false);
  const made = step.kind === "code" ? step.made : null;

  useSessionCheck(signedIn !== null, () => {
    setSignedOutElsewhere(true);
  });
  useStartPoll(made, setStep);

  const ask = () => {
    setBusy(true);
    setSignedOutElsewhere(false);
    deps()
      .then(startSignIn)
      .then((link) => {
        setStep({ kind: "code", made: link });
      })
      .catch(() => {
        setStep({ kind: "expired" });
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return {
    title: t.account,
    signedIn,
    signedInWords:
      signedIn === null ? "" : fill(t.signedInAs, { name: signedIn.name }),
    signedOutNote: signedOutElsewhere ? t.youreSignedOut : null,
    step,
    busy,
    code: made === null ? null : spaced(made.code),
    link: made === null ? "" : `https://t.me/${BOT}?start=${made.code}`,
    privacyLine: t.signInPrivacyLine,
    start: {
      label: t.continueTelegram,
      run: () => {
        setStep({ kind: "explain" });
      },
    },
    go: { label: t.continueWord, run: ask },
    openTelegram: t.openTelegram,
    waiting: t.waitingForTelegram,
    ranOut: t.codeRanOut,
    tryAgain: { label: t.tryAgain, run: ask },
    signOut: {
      label: t.signOut,
      run: () => {
        setBusy(true);
        void deps()
          .then(signOut)
          .finally(() => {
            setBusy(false);
            setStep({ kind: "idle" });
          });
      },
    },
  };
}
