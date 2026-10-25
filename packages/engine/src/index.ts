// The plan engine (ADR 0016): pure TypeScript, no DOM, storage or network.
// Apps import it as "@cookto/engine".
export { addDays, daysLeft } from "./expiry.js";
export { assumedStaples, missing } from "./needs.js";
export { type MealDish, type Used, usedBy } from "./used.js";
export {
  type Adding,
  type Answer,
  answerKey,
  type LineIn,
  lineAmount,
  type ReceiptRow,
  receiptLines,
  rowsToAdd,
} from "./receipt.js";
export {
  type Cooked,
  cookedLately,
  cookedOn,
  plannedLately,
} from "./cooked.js";
export {
  childrenOnly,
  type DaysOff,
  defaultMeals,
  eatersOf,
  MEAL_SLOTS,
  MEAL_TIMES,
  type MealSlot,
  type MealTimes,
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
