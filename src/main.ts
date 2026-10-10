import { isLocale, LOCALES, type Locale } from "./i18n/index.js";

// The page's only script. Everything stays in this browser (ADR 0013).

const STORAGE_KEY = "cookto.day:language";

function savedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLocale(saved) ? saved : null;
  } catch {
    return null; // storage can be off (private mode); English it is
  }
}

function applyLocale(locale: Locale): void {
  const { dir, messages } = LOCALES[locale];
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key && key in messages)
      el.textContent = messages[key as keyof typeof messages];
  }
}

function setUpLanguageSwitch(current: Locale): void {
  const select = document.querySelector<HTMLSelectElement>("#language");
  if (!select) return;
  for (const [code, { name }] of Object.entries(LOCALES)) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    option.lang = code;
    select.append(option);
  }
  select.value = current;
  select.addEventListener("change", () => {
    if (!isLocale(select.value)) return;
    applyLocale(select.value);
    try {
      localStorage.setItem(STORAGE_KEY, select.value);
    } catch {
      // not remembered, but the page still switches
    }
  });
}

const locale = savedLocale() ?? "en";
setUpLanguageSwitch(locale);
applyLocale(locale);
