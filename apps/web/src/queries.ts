import type { Changes } from "@cookto/data";
import { QueryClient } from "@tanstack/react-query";

// Reading saved data (ADR 0024): screen hooks read repositories through
// TanStack Query. A query's key starts with the topic its repository
// announces ("household"), so a saved change refreshes whatever shows it,
// and use cases never import React or TanStack.

export function createQueries(changes: Changes): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Reads come from the phone's own copy: they work offline, and stay
        // fresh until a change says otherwise.
        networkMode: "always",
        staleTime: Infinity,
        // A local read that failed won't pass by trying again.
        retry: false,
      },
    },
  });
  changes.subscribe((topic) => {
    const queryKey = [topic];
    // A read already running may have started before the change. Without
    // data yet, TanStack would hand its answer to the refresh too, so stop
    // it first, then read again.
    void client
      .cancelQueries({ queryKey })
      .then(() => client.invalidateQueries({ queryKey }));
  });
  return client;
}
