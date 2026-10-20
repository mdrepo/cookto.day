import { useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import { api } from "../../platform.js";
import { send as share } from "../../share.js";
import { BOT, spaced } from "./useCookLink.js";

// An invite (specs/217): "Who?", then a code and the bot's link to share.
// Someone who plans gets an account and joins; the cook joins by Telegram
// alone. While the code shows, the household is asked again every few
// seconds, so the new member appears.

export type Invite =
  | { kind: "idle" }
  | { kind: "who" }
  /** `members`: how many there were, so one more means they're in. */
  | { kind: "code"; code: string; members: number };

export function useInvite(members: number) {
  const { t } = useWords();
  const [invite, setInvite] = useState<Invite>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  // They pressed Start: the code has done its work.
  const done = invite.kind === "code" && members > invite.members;
  return {
    invite: done ? ({ kind: "idle" } as Invite) : invite,
    busy,
    label: t.invite,
    who: t.whoToInvite,
    askWho: () => {
      setInvite({ kind: "who" });
    },
    roles: [
      { role: "plan" as const, label: t.someoneWhoPlans },
      { role: "cook" as const, label: t.theCook },
    ],
    chooseRole: (role: "plan" | "cook") => {
      setBusy(true);
      void api()
        .then((a) => a.invite(role))
        .then(({ code }) => {
          setInvite({ kind: "code", code, members });
        })
        .catch(() => {
          setInvite({ kind: "idle" });
        })
        .finally(() => {
          setBusy(false);
        });
    },
    code: invite.kind === "code" ? spaced(invite.code) : null,
    sendLink: {
      label: t.sendTheLink,
      run: () => {
        if (invite.kind === "code")
          void share(`https://t.me/${BOT}?start=${invite.code}`);
      },
    },
    waiting: t.waitingForThem,
  };
}
