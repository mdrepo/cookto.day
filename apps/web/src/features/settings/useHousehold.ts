import type { HouseholdView, MemberRow } from "@cookto/data";
import { upcomingDaysOff } from "@cookto/engine/schedule";
import {
  currentHousehold,
  deleteAccount,
  joinOrStart,
  leaveHousehold,
  reflectCook,
} from "@cookto/usecases/household-sync";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useStore } from "zustand";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  api,
  householdSync,
  queries,
  settings,
  today,
} from "../../platform.js";
import { offWords } from "./daysOffWords.js";
import { useInvite } from "./useInvite.js";

// The household (specs/217), in Settings when signed in: who's in it, an
// invite by role, leave, delete the account; "Start a household" when the
// account has none. The members come from the API, not the phone's copy.

const POLL_MS = 3_000;

/** The household as the API answers it, or null when the account has none. */
export const householdQuery = {
  queryKey: ["account", "household"],
  queryFn: () =>
    householdSync().then(async (d) => {
      const view = await currentHousehold(d);
      // The household's cook is this phone's cook (specs/217).
      if (view)
        reflectCook(d.settings, d.settings.cook(), view.members, d.now());
      return view;
    }),
};

function useMembers(signedIn: boolean, polling: boolean) {
  return useQuery(
    {
      ...householdQuery,
      enabled: signedIn,
      // Settings opened: ask again, so a member who left or joined shows.
      refetchOnMount: "always",
      refetchInterval: polling ? POLL_MS : false,
    },
    queries,
  );
}

/** A step with the busy state around it; the view is read again after. */
function useStep() {
  const [busy, setBusy] = useState(false);
  const step = (work: () => Promise<unknown>) => {
    setBusy(true);
    void work()
      .catch(() => undefined)
      .finally(() => {
        setBusy(false);
        void queries.invalidateQueries({ queryKey: householdQuery.queryKey });
      });
  };
  return { busy, step };
}

export function useHousehold() {
  const { t, locale } = useWords();
  const signedIn = useStore(settings.store, (s) => s.signedIn);
  const timeZone = useStore(settings.store, (s) => s.timeZone);
  const daysOff = useStore(settings.store, (s) => s.daysOff);
  const off = offWords(upcomingDaysOff(daysOff, today()), t, locale);
  const [confirming, setConfirming] = useState(false);
  const { busy, step } = useStep();
  const [polling, setPolling] = useState(false);
  const { data } = useMembers(signedIn !== null, polling);
  const view: HouseholdView | null = data ?? null;
  const invite = useInvite(view?.members.length ?? 0);
  const inviting = invite.invite.kind === "code";
  if (inviting !== polling) setPolling(inviting);
  const mine = view?.members.find(
    (m) => m.kind === "account" && m.name === signedIn?.name,
  );
  const whoIs = (m: MemberRow) =>
    m.kind === "telegram" ? t.theCook : (m.name ?? t.theCook);
  const remove = (m: MemberRow) => {
    const leaving = m.id === mine?.id;
    return {
      label: leaving ? t.leave : t.remove,
      name: `${leaving ? t.leave : t.remove} ${whoIs(m)}`,
      run: () => {
        if (leaving)
          step(() => householdSync().then((d) => leaveHousehold(d, m.id)));
        else step(() => api().then((a) => a.removeMember(m.id)));
      },
    };
  };

  if (signedIn === null) return null;
  return {
    title: t.householdTitle,
    view,
    busy: busy || invite.busy,
    members: (view?.members ?? []).map((m) => ({
      key: m.id,
      name:
        m.kind === "telegram"
          ? t.theCookOnTelegram
          : fill(t.memberPlans, { name: m.name ?? "" }),
      line: m.stopped
        ? t.stopped
        : m.role === "cook"
          ? (off ?? undefined)
          : undefined,
      remove: remove(m),
    })),
    /** The cook's days off show once there's a cook (specs/240). */
    hasCook: (view?.members ?? []).some((m) => m.role === "cook"),
    timeZone: timeZone === null ? null : fill(t.timeZoneIs, { zone: timeZone }),
    start: {
      label: t.startHousehold,
      run: () => {
        step(() => householdSync().then(joinOrStart));
      },
    },
    invite,
    deleteAccount: {
      label: t.deleteAccount,
      line: t.deleteAccountLine,
      confirming,
      ask: () => {
        setConfirming(true);
      },
      cancel: () => {
        setConfirming(false);
      },
      run: () => {
        setConfirming(false);
        step(() => householdSync().then(deleteAccount));
      },
    },
    closeLabel: t.close,
  };
}
