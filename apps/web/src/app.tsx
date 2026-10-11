import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { isLocale, LOCALES, type Locale } from "./i18n/index.js";

// The first page. Everything stays in this browser (ADR 0013).

const STORAGE_KEY = "cookto.day:language";

function savedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLocale(saved) ? saved : null;
  } catch {
    return null; // storage can be off (private mode); English it is
  }
}

function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // not remembered, but the page still switches
  }
}

export function App() {
  const [locale, setLocale] = useState<Locale>(() => savedLocale() ?? "en");
  const { dir, messages: t } = LOCALES[locale];

  // The whole document switches language and direction, not just this tree.
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  function choose(value: string) {
    if (!isLocale(value)) return;
    // Switch at once, in the same frame as the tap.
    flushSync(() => {
      setLocale(value);
    });
    saveLocale(value);
  }

  return (
    <>
      <header className="site-header">
        <h1 className="site-title">cookto.day</h1>
        <p className="site-tagline">{t.tagline}</p>
        <label className="field">
          <span>{t.languageLabel}</span>
          <select
            id="language"
            className="field-select"
            value={locale}
            onChange={(e) => {
              choose(e.currentTarget.value);
            }}
          >
            {Object.entries(LOCALES).map(([code, { name }]) => (
              <option key={code} value={code} lang={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="page">
        <section className="empty-state" aria-labelledby="empty-title">
          <h2 id="empty-title" className="empty-title">
            {t.emptyTitle}
          </h2>
          <p className="empty-body">{t.emptyBody}</p>
        </section>
        <p className="note">{t.privacy}</p>
      </main>
    </>
  );
}
