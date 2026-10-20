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
import { useJoin } from "./useJoin.js";
import { useQr, useWide } from "./useQr.js";

// Sign in with Telegram (specs/216), on any phone: a sheet with one line
// about what's kept, then the code and the bot's link, polled every 3
// seconds until Start happened, or the code ran out. On a wide screen the
// link is a QR code too (the owner's design, 20 Oct). Signed in, the name
// and "Sign out"; right after, the household is joined or started (#217).

const POLL_MS = 3_000;

type Step =
  | { kind: "idle" }
  | { kind: "explain" }
  | { kind: "code"; made: LinkMade }
  | { kind: "expired" };

const deps = async () => ({ api: await api(), settings: settings.writer });

/** The household question, when joining would replace this phone's kitchen. */
function questionOf(
  t: ReturnType<typeof useWords>["t"],
  join: ReturnType<typeof useJoin>,
) {
  if (join.question === null) return null;
  return {
    text: fill(t.replaceKitchenQuestion, { name: join.question }),
    replace: { label: t.replace, run: join.replace },
    notNow: { label: t.notNow, run: join.notNow },
  };
}

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
function useStartPoll(
  made: LinkMade | null,
  setStep: (step: Step) => void,
  onSignedIn: () => void,
) {
  // The latest callback, without restarting the poll on every render.
  const signedIn = useRef(onSignedIn);
  useEffect(() => {
    signedIn.current = onSignedIn;
  });
  useEffect(() => {
    if (made === null) return;
    let stop = false;
    const tick = async () => {
      const state = await deps()
        .then((d) => signInConnected(d, made, now().toISOString()))
        .catch(() => "waiting" as const);
      if (stop) return;
      if (state === "signed-in") {
        setStep({ kind: "idle" });
        signedIn.current();
      } else if (state === "expired") setStep({ kind: "expired" });
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
  const link = made === null ? null : `https://t.me/${BOT}?start=${made.code}`;
  const qr = useQr(link, useWide());

  useSessionCheck(signedIn !== null, () => {
    setSignedOutElsewhere(true);
  });
  const join = useJoin();
  useStartPoll(made, setStep, join.onSignedIn);

  const ask = () => {
    setBusy(true);
    setSignedOutElsewhere(false);
    deps()
      .then(startSignIn)
      .then((made) => {
        setStep({ kind: "code", made });
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
    question: questionOf(t, join),
    closeLabel: t.close,
    close: () => {
      setStep({ kind: "idle" });
    },
    signedIn,
    signedInWords:
      signedIn === null ? "" : fill(t.signedInAs, { name: signedIn.name }),
    signedOutNote: signedOutElsewhere ? t.youreSignedOut : null,
    step,
    busy,
    code: made === null ? null : spaced(made.code),
    qr,
    qrLabel: t.qrCode,
    startLine: made === null ? "" : fill(t.orSendStart, { code: made.code }),
    privacyLine: t.signInPrivacyLine,
    start: {
      label: t.continueTelegram,
      run: () => {
        setStep({ kind: "explain" });
      },
    },
    go: { label: t.continueWord, run: ask },
    openTelegram: {
      label: t.openTelegram,
      run: () => {
        if (link !== null) window.open(link, "_blank", "noopener");
      },
    },
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
