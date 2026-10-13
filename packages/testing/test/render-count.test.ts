import { describe, expect, test } from "bun:test";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { renderCount } from "../src/render-count.js";

// specs/55-new-screen.md, criterion 1: a hook's re-renders can be counted, so
// a screen hook's tests can say what re-renders (ADR 0023).

describe("renderCount", () => {
  test("a hook's re-renders can be counted", () => {
    const store = createStore(() => ({ read: 1, other: 1 }));
    const hook = renderCount(() => useStore(store, (s) => s.read));
    try {
      expect(hook.renders()).toBe(1);

      hook.act(() => {
        store.setState({ other: 2 });
      });
      expect(hook.renders()).toBe(1);

      hook.act(() => {
        store.setState({ read: 5 });
      });
      expect(hook.renders()).toBe(2);
      expect(hook.value()).toBe(5);
    } finally {
      hook.unmount();
    }
  });
});
