import { MEMBER_KINDS } from "@cookto/engine";
import { addPerson } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useWords } from "../../i18n/useWords.js";
import { household, membersQuery, queries, settings } from "../../platform.js";

const deps = { household, settings: settings.writer };

/**
 * Who eats at home: everyone's id, so each card reads its own person and a
 * tick redraws only that card (criterion 9), and a way to add more.
 */
export function useWhoStep() {
  const { t } = useWords();
  const { data: ids } = useQuery(
    { ...membersQuery, select: (members) => members.map((m) => m.id) },
    queries,
  );
  return {
    ids: ids ?? [],
    nobody: ids?.length === 0 ? t.nobody : null,
    adders: MEMBER_KINDS.map((kind) => ({
      kind,
      label: t[kind],
      add: () => void addPerson(deps, kind),
    })),
  };
}
