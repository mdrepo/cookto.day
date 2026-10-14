import { useLayoutEffect } from "react";
import { useStore } from "zustand";
import { settings } from "../../platform.js";

/**
 * Keeps the whole document on the chosen theme (specs/96): `data-theme` on
 * the root, which the tokens follow; none follows the phone.
 */
export function useDocumentTheme(): void {
  const theme = useStore(settings.store, (s) => s.theme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
}
