import type { LinkMade } from "@cookto/data";
import {
  connectCook,
  cookConnected,
  disconnectCook,
} from "@cookto/usecases/cook";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { useRole } from "../../food.js";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { api, now, settings } from "../../platform.js";
import { send as share } from "../../share.js";
import { useQr } from "./useQr.js";

// Connect the cook's Telegram (specs/207), on a phone that plans: a sheet
// with one line about Telegram, then a code to send her, polled every 3
// seconds until she has pressed Start, or the code ran out. The link is a
// QR code too, on every screen: she scans the planner's phone (the owner's
// design, 20 Oct).

/** The bot she presses Start on; its link carries the code. */
export const BOT = "cookto_day_bot";
const POLL_MS = 3_000;

/** A code as read out loud: KM7Q-4HTX. */
export const spaced = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

type Step =
  | { kind: "idle" }
  | { kind: "explain" }
  | { kind: "code"; made: LinkMade }
  | { kind: "expired" };

const deps = async () => ({ api: await api(), settings: settings.writer });

/** While the code shows, ask every few seconds whether she has connected. */
function useCookPoll(made: LinkMade | null, setStep: (step: Step) => void) {
  const stop = useRef(false);
  useEffect(() => {
    if (made === null) return;
    stop.current = false;
    const tick = async () => {
      const state = await deps()
        .then((d) => cookConnected(d, made, now().toISOString()))
        .catch(() => "waiting" as const);
      if (stop.current) return;
      if (state === "connected") setStep({ kind: "idle" });
      else if (state !== "waiting") setStep({ kind: "expired" });
    };
    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stop.current = true;
      clearInterval(timer);
    };
  }, [made, setStep]);
}

export function useCookLink() {
  const { t } = useWords();
  const role = useRole();
  const cook = useStore(settings.store, (s) => s.cook);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const made = step.kind === "code" ? step.made : null;
  const link = made === null ? null : `https://t.me/${BOT}?start=${made.code}`;
  const qr = useQr(link, true);
  useCookPoll(made, setStep);

  const ask = () => {
    setBusy(true);
    deps()
      .then(connectCook)
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

  if (role !== "plan") return null;
  return {
    title: t.cookTelegram,
    connected: cook !== null,
    connectedWords: t.connected,
    step,
    busy,
    closeLabel: t.close,
    close: () => {
      setStep({ kind: "idle" });
    },
    code: made === null ? null : spaced(made.code),
    qr,
    qrLabel: t.qrCode,
    startLine: made === null ? "" : fill(t.orSendStart, { code: made.code }),
    privacyLine: t.cookPrivacyLine,
    start: {
      label: t.connectCook,
      run: () => {
        setStep({ kind: "explain" });
      },
    },
    connect: { label: t.connect, run: ask },
    sendLink: {
      label: t.sendTheLink,
      run: () => {
        if (link !== null) void share(link);
      },
    },
    waiting: t.waitingForCook,
    ranOut: t.codeRanOut,
    tryAgain: { label: t.tryAgain, run: ask },
    disconnect: {
      label: t.disconnect,
      run: () => {
        if (cook === null) return;
        setBusy(true);
        void deps()
          .then((d) => disconnectCook(d, cook))
          .finally(() => {
            setBusy(false);
            setStep({ kind: "idle" });
          });
      },
    },
  };
}
