import { Window } from "happy-dom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

// Counts how often a hook runs, so a screen hook's tests can say what
// re-renders and what doesn't (ADR 0023). The hook runs inside a component
// mounted in happy-dom, with React's act: no browser needed.

export interface Counted<T> {
  /** How many times the hook has run, the first mount included. */
  renders(): number;
  /** What the hook returned last. */
  value(): T;
  /** Makes a change (a store update, a click) and lets React finish. */
  act(change: () => void): void;
  unmount(): void;
}

type Globals = Record<string, unknown>;

export function renderCount<T>(hook: () => T): Counted<T> {
  const win = new Window();
  const globals = globalThis as Globals;
  const before = {
    window: globals.window,
    document: globals.document,
    IS_REACT_ACT_ENVIRONMENT: globals.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globals, {
    window: win,
    document: win.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  let renders = 0;
  let last: { value: T } | null = null;
  function Probe() {
    renders += 1;
    last = { value: hook() };
    return null;
  }

  const root = createRoot(
    win.document.createElement("div") as unknown as HTMLElement,
  );
  act(() => {
    root.render(createElement(Probe));
  });

  return {
    renders: () => renders,
    value() {
      if (!last) throw new Error("The hook hasn't run.");
      return last.value;
    },
    act(change) {
      act(change);
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      void win.happyDOM.close();
      Object.assign(globals, before);
    },
  };
}
