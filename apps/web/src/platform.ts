import { createSettings } from "@cookto/data";
import { browserKeyValue } from "@cookto/data-web";
import { openCountries } from "@cookto/engine";
import { LOCALES } from "./i18n/index.js";

// The one file that hands the browser's storage (@cookto/data-web) and
// address to the data layer (ADR 0024). Everything else reads and writes
// through @cookto/data.

/** ?preview-language=ar: a reviewer's look at a language that's coming soon. */
function previewLanguage(): string | null {
  if (typeof location === "undefined") return null; // the prerender
  return new URLSearchParams(location.search).get("preview-language");
}

export const settings = createSettings(browserKeyValue(), {
  languages: Object.entries(LOCALES)
    .filter(([, locale]) => !locale.soon)
    .map(([code]) => code),
  fallback: "en",
  previews: Object.keys(LOCALES),
  preview: previewLanguage(),
  countries: openCountries(),
  fallbackCountry: "SG",
});
