// The plan engine (ADR 0016): pure TypeScript, no DOM, storage or network.
// Apps import it as "@cookto/engine".
export { addDays, daysLeft } from "./expiry.js";
export { assumedStaples, missing } from "./needs.js";
export { type Cooked, cookedLately, cookedOn } from "./cooked.js";
export {
  childrenOnly,
  defaultMeals,
  eatersOf,
  MEAL_SLOTS,
  type MealSlot,
  type Member,
  MEMBER_KINDS,
  type MemberKind,
  memberProblems,
  plannedSlots,
  servings,
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
export {
  type Beans,
  overnight,
  type Plan,
  type Prep,
  type PrepEvent,
  prepEvents,
  prepFor,
  type PrepKind,
  PREP_KINDS,
  waitingForPrep,
} from "./prep.js";
export {
  clashes,
  type FoodMatch,
  matchFood,
  nameIndex,
  type NameIndex,
  tidy,
} from "./names.js";
