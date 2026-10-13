// Repositories announce what changed ("household"), so whatever shows it can
// read it again (ADR 0024). The app turns announcements into query refreshes.

export interface Changes {
  announce(topic: string): void;
  /** Calls `listener` on every announcement; returns how to stop. */
  subscribe(listener: (topic: string) => void): () => void;
}

export function createChanges(): Changes {
  const listeners = new Set<(topic: string) => void>();
  return {
    announce(topic) {
      for (const listener of listeners) listener(topic);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
