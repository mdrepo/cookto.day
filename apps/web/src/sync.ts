import { useEffect } from "react";
import { useStore } from "zustand";
import { householdSync, settings } from "./platform.js";

// Sync, when it runs (specs/217, ADR 0033): when the app opens, when it
// comes back to the front, and when the phone is back online; after a
// write, the data layer itself asks for one after a short pause. Only when
// signed in: a phone that isn't has nothing on the server.

/** Runs a sync at the moments above, while signed in. */
export function useSync(): void {
  const signedIn = useStore(settings.store, (s) => s.signedIn !== null);
  useEffect(() => {
    if (!signedIn) return;
    const run = () => {
      void Promise.all([
        householdSync(),
        import("@cookto/usecases/household-sync"),
      ]).then(([d, m]) => m.syncNow(d));
    };
    const whenShown = () => {
      if (document.visibilityState === "visible") run();
    };
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", whenShown);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", whenShown);
    };
  }, [signedIn]);
}
