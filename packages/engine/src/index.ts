// The plan engine (ADR 0016): pure TypeScript, no DOM, storage or network.
// Apps import it as "@cookto/engine".
export { daysLeft } from "./expiry.js";
export {
  defaultMeals,
  eatersOf,
  MEAL_SLOTS,
  type MealSlot,
  type Member,
  MEMBER_KINDS,
  type MemberKind,
  memberProblems,
  plannedSlots,
} from "./household.js";
export { COUNTRIES, type Country, openCountries } from "./places.js";
export {
  type Condition,
  CONDITIONS,
  conditionOf,
  type PantryItem,
  pantryOrder,
  shownAmount,
  type ShownUnit,
  type Unit,
  UNITS,
  useBy,
} from "./pantry.js";
export {
  type CookTodayInput,
  cookToday,
  cookTodayForMeals,
  type Dish,
  type MealSuggestions,
  type Suggestion,
} from "./cook-today.js";
