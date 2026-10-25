import type { Cook } from "@cookto/data";
import { timeWords } from "@cookto/engine/time";
import { sendTomorrow, type Sent } from "@cookto/usecases/cook";
import { useEffect, useRef, useState } from "react";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { api, now as clock, settings } from "../../platform.js";

// Tomorrow's plan reaching the cook (specs/207, specs/241): "Looks good"
// sends now; otherwise the bot asks at 10 pm and sends it as planned at 11,
// so nothing waits on the phone. A change after sending asks for "Send
// again". The plan's text is the same as "Share tomorrow"'s. Loaded with
// SendToCook, only once a cook is connected.

/** From this time the plan shows; the bot asks at 10 pm, sends at 11. */
const EVENING_FROM = "16:00";
const ASKS_AT = "22:00";
const SENT_AT = "23:00";

const deps = async () => ({ api: await api(), settings: settings.writer });

export interface SendState {
  /** One line under the plan, or none. */
  line: { text: string; tone: "good" | "warm" } | null;
  /** "Send again", "Send to the cook", or none. */
  button: { label: string; run: () => void } | null;
}

export interface SendProps {
  /** The cook, or none once she has left. */
  cook: Cook | null;
  /** The household's clock, "YYYY-MM-DDTHH:MM", in the phone's time. */
  now: string;
  /** Tomorrow, "YYYY-MM-DD". */
  on: string;
  /** The plan as "Share tomorrow" would share it. */
  text: string;
  /** Counts "Looks good" presses: each one sends. */
  approved: number;
}

type Last = Sent | "sending" | null;

/** Sends the plan now, and reports how it went. */
function sendNow(
  cook: Cook,
  plan: { on: string; text: string },
  report: (result: Last) => void,
): void {
  report("sending");
  void deps().then(async (d) => {
    report(await sendTomorrow(d, cook, plan, clock().toISOString()));
  });
}

export function useSendToCook(p: SendProps): SendState {
  const { cook, now, on, text, approved } = p;
  const { locale, t } = useWords();
  const [last, setLast] = useState<Last>(null);
  const sentFor = useRef(0);

  const sentToday = cook?.sent?.on === on ? cook.sent : null;
  const time = now.slice(11);
  const beforeAsked = time >= EVENING_FROM && time < ASKS_AT;
  const after11 = time >= SENT_AT;

  // "Looks good" pressed: send, once per press, the plan as it stands then.
  useEffect(() => {
    if (!cook || approved === 0 || sentFor.current === approved) return;
    sentFor.current = approved;
    sendNow(cook, { on, text }, setLast);
  }, [approved, cook, on, text]);

  if (!cook)
    return {
      line: last === "gone" ? { text: t.cookDisconnected, tone: "warm" } : null,
      button: null,
    };
  const again = {
    label: t.sendAgain,
    run: () => {
      sendNow(cook, { on, text }, setLast);
    },
  };
  if (last === "failed")
    return { line: { text: t.couldntSend, tone: "warm" }, button: again };
  if (sentToday !== null && sentToday.text !== text)
    return { line: { text: t.changedSinceSent, tone: "warm" }, button: again };
  if (sentToday !== null)
    return {
      line: {
        text: fill(t.sentToCook, { time: timeWords(sentToday.at, locale) }),
        tone: "good",
      },
      button: null,
    };
  if (beforeAsked)
    return { line: { text: t.weAskAtTen, tone: "good" }, button: null };
  if (after11) return { line: null, button: { ...again, label: t.sendToCook } };
  return { line: null, button: null };
}
