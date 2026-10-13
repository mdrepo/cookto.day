// Use cases (ADR 0022): the app's steps, as plain functions grouped by domain
// (settings.ts, later pantry.ts, plan.ts, bills.ts), shared by every screen
// and every app. They take the repositories they need as arguments, so tests
// pass fakes. No React, no browser: lint and this package's types keep them
// out.
export { chooseCountry, chooseLanguage } from "./settings.js";
