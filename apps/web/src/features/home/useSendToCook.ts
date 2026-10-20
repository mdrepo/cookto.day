import type { Cook, PlanSent } from "@cookto/data";
import { dayAt, timeWords } from "@cookto/engine/time";
import {
  scheduleTomorrow,
  sendTomorrow,
  type Sent,
} from "@cookto/usecases/cook";
import { useEffect, useRef, useState } from "react";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { api, now as clock, settings } from "../../platform.js";

// Tomorrow's plan reaching the cook (specs/207): "Looks good" sends now;
// opening Tomorrow from 4 pm schedules it for 9 pm; a change after sending
// asks for "Send again". The plan's text is the same as "Share tomorrow"'s.
// Loaded with SendToCook, only once a cook is connected.

/** From this time the plan is scheduled; at this time the server sends it. */
const SCHEDULE_FROM = "16:00";
const SENDS_AT = "21:00";

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
  const tried = useRef("");
  const sentFor = useRef(0);

  const forToday = (p: PlanSent | null | undefined) =>
    p?.on === on ? p : null;
  const sentToday = forToday(cook?.sent);
  const waiting = forToday(cook?.scheduled);
  const evening = now.slice(11) >= SCHEDULE_FROM;
  const after9 = now.slice(11) >= SENDS_AT;

  // "Looks good" pressed: send, once per press, the plan as it stands then.
  useEffect(() => {
    if (!cook || approved === 0 || sentFor.current === approved) return;
    sentFor.current = approved;
    sendNow(cook, { on, text }, setLast);
  }, [approved, cook, on, text]);

  // Silence is yes: once the evening's plan shows, it waits on the server
  // for 9 pm, as it stands; a change replaces it. Once sent, nothing waits.
  useEffect(() => {
    if (!cook || !evening || after9 || sentToday !== null) return;
    if (waiting?.text === text) return;
    const key = `${on}\n${text}`;
    if (tried.current === key) return;
    tried.current = key;
    const at = dayAt(now.slice(0, 10), SENDS_AT);
    void deps()
      .then((d) => scheduleTomorrow(d, cook, { on, text }, at))
      .then((result) => {
        // She has gone: say so now, not at the next press.
        if (result === "gone") setLast("gone");
      });
  }, [cook, evening, after9, sentToday, waiting, on, text, now]);

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
  if (waiting !== null && !after9)
    return { line: { text: t.goesToCook, tone: "good" }, button: null };
  if (after9) return { line: null, button: { ...again, label: t.sendToCook } };
  return { line: null, button: null };
}
