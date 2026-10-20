import {
  currentHousehold,
  joinOrStart,
  replaceWithHousehold,
} from "@cookto/usecases/household-sync";
import { useState } from "react";
import { householdSync, queries } from "../../platform.js";

// Right after signing in (specs/217): the account's household is joined,
// or started from this phone's records. When this phone has a kitchen of
// its own, the person is asked before it's replaced.

const KEY = ["account"];

export function useJoin() {
  /** The name of the household's first planner, while the question shows. */
  const [question, setQuestion] = useState<string | null>(null);
  const refresh = () => queries.invalidateQueries({ queryKey: KEY });
  return {
    question,
    onSignedIn: () => {
      void householdSync()
        .then(async (d) => {
          if ((await joinOrStart(d)) !== "ask") return;
          const view = await currentHousehold(d);
          setQuestion(view?.members[0]?.name ?? "");
        })
        .catch(() => undefined)
        .finally(() => void refresh());
    },
    replace: () => {
      setQuestion(null);
      void householdSync()
        .then(replaceWithHousehold)
        .catch(() => undefined)
        .finally(() => void refresh());
    },
    notNow: () => {
      setQuestion(null);
    },
  };
}
