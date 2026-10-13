import { createSettings } from "@cookto/data";
import { browserKeyValue } from "@cookto/data-web";
import { LOCALES } from "./i18n/index.js";

// The one file that hands the browser's storage (@cookto/data-web) to the
// data layer (ADR 0024). Everything else reads and writes through
// @cookto/data.

export const settings = createSettings(browserKeyValue(), {
  languages: Object.keys(LOCALES),
  fallback: "en",
});
