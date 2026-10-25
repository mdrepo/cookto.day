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
  chooseCuisine,
  clearSample,
  type Food,
  keepMovedDishes,
  loadCuisine,
  markFood,
  setMakes,
  trySample,
  useUp,
} from "./kitchen.js";
export { cookedIt, KEEP_DIFFERENT_DAYS, notCooked } from "./cooked.js";
export { addToMyDishes, takeOutOfMyDishes } from "./my-dishes.js";
export {
  chooseRole,
  didntMake,
  sortTomorrow,
  swapTomorrow,
} from "./who-cooks.js";
export {
  addBoughtFood,
  addToList,
  addTypedToList,
  bought,
} from "./shopping.js";
export { chooseCountry, chooseLanguage, chooseTheme } from "./settings.js";
export {
  type TomorrowParts,
  tomorrowText,
  type TomorrowWords,
} from "./tomorrow.js";
export {
  type Planned,
  type PlanInput,
  planLines,
  type PlanMeal,
  planMeals,
  tonightLines,
} from "./plan-lines.js";
export { type PlanChange, planChanges, samePlan } from "./plan-changes.js";
export { type IdeasInput, mealIdeas, packStaples } from "./meal-ideas.js";
// The schedule (specs/240) is "@cookto/usecases/schedule", its own entry:
// only Settings' meal times and days off load it.
// The cook's Telegram (specs/207) is "@cookto/usecases/cook", its own entry:
// the app loads it only once a cook is connected, to keep the page small.
export { chooseBeans, keepTomorrow, prepDone, prepNotDone } from "./prep.js";
export { addChildDish, childAddIn, removeChildDish } from "./child-dish.js";
