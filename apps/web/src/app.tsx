import { EmptyState, Field, Note, Select } from "@cookto/ui";
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
        <Field label={t.languageLabel} layout="inline" id="language">
          {(control) => (
            <Select
              {...control}
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
            </Select>
          )}
        </Field>
      </header>
      <main className="page">
        <EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
        <Note>{t.privacy}</Note>
      </main>
    </>
  );
}
