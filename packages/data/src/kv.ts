// A synchronous key-value store, for the few small settings that must be
// ready before the first draw (specs/51-settings.md): the web app passes one
// built on the browser's localStorage (apps/web/src/platform.ts); tests and
// the prerender pass memoryKeyValue(). Saved data uses IndexedDB (ADR 0024).

export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** A key-value store in memory, optionally holding some values already. */
export function memoryKeyValue(initial: Record<string, string> = {}): KeyValue {
  const values = new Map(Object.entries(initial));
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
  };
}
