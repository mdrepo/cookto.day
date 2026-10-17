// Use cases (ADR 0022): the app's steps, as plain functions grouped by domain
// (settings.ts, later pantry.ts, plan.ts, bills.ts), shared by every screen
// and every app. They take the repositories they need as arguments, so tests
// pass fakes. No React, no browser: lint and this package's types keep them
// out.
export {
  addPerson,
  finishOnboarding,
  removePerson,
  renamePerson,
  skipOnboarding,
  startHousehold,
  toggleMeal,
} from "./household.js";
export {
  addFood,
  addStaples,
  bringBack,
  changeAmount,
  clearSample,
  type Food,
  loadCuisine,
  markFood,
  setMakes,
  trySample,
  useUp,
} from "./kitchen.js";
export { cookedIt, KEEP_DIFFERENT_DAYS, notCooked } from "./cooked.js";
export {
  addBoughtFood,
  addToList,
  addTypedToList,
  bought,
} from "./shopping.js";
export { chooseCountry, chooseLanguage, chooseTheme } from "./settings.js";
