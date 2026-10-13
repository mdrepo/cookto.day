import type { SettingsWriter } from "@cookto/data/write";

/**
 * Switches the app to `language`, if the app speaks it. Returns whether it
 * did, so a screen can ignore a stale choice.
 */
export function chooseLanguage(
  { settings }: { settings: SettingsWriter },
  language: string,
): boolean {
  if (!settings.speaks(language)) return false;
  settings.setLanguage(language);
  return true;
}

/** Sets where the household lives, if people can choose it yet. */
export function chooseCountry(
  { settings }: { settings: SettingsWriter },
  country: string,
): boolean {
  if (!settings.knowsCountry(country)) return false;
  settings.setCountry(country);
  return true;
}
