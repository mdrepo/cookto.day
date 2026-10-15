import { MEMBER_KINDS } from "@cookto/engine";
import { addPerson } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import { household, membersQuery, queries, settings } from "../../platform.js";

const deps = { household, settings: settings.writer };

/**
 * Who eats at home: everyone's id, so each card reads its own person and a
 * tick redraws only that card (criterion 9), and a way to add more. One card
 * is open at a time, the newest unless they open another, and the add
 * buttons come back into view after each add (#114).
 */
export function useWhoStep() {
  const { t } = useWords();
  const { data } = useQuery(
    { ...membersQuery, select: (members) => members.map((m) => m.id) },
    queries,
  );
  const ids = data ?? [];
  const [chosen, setOpen] = useState<string | null>(null);
  const people = data?.length;
  const seen = useRef(people);
  useEffect(() => {
    const before = seen.current;
    seen.current = people;
    // After an add, the add buttons come back into view: the step's own
    // buttons stay pinned at the bottom, so the page's end is just above them.
    if (before !== undefined && people !== undefined && people > before)
      scrollTo({ top: document.documentElement.scrollHeight });
  }, [people]);
  return {
    ids,
    open: chosen !== null && ids.includes(chosen) ? chosen : ids.at(-1),
    setOpen,
    nobody: data?.length === 0 ? t.nobody : null,
    adders: MEMBER_KINDS.map((kind) => ({
      kind,
      label: t[kind],
      add: () => {
        setOpen(null);
        void addPerson(deps, kind);
      },
    })),
  };
}
