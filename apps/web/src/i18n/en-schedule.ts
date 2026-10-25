// English, the household's schedule (specs/240): meal times, the time zone
// and the cook's days off; pages the bot opens inside Telegram (specs/241,
// 260); setup's cuisines (specs/263); and receipt photos (specs/129, from
// en-receipt.ts). On its own so en.ts stays under its size; en.ts spreads
// it in, and the other languages have these keys too.

import { enReceipt } from "./en-receipt.js";

export const enSchedule = {
  ...enReceipt,
  mealTimes: "Meal times",
  timeZoneIs: "Time zone: {zone}",
  mealMustBeAfter: "{meal} must be after {before}.",
  daysOff: "Days off",
  addADate: "Add a date",
  offDays: "Off {days}",
  sundays: "Sundays",
  mondays: "Mondays",
  tuesdays: "Tuesdays",
  wednesdays: "Wednesdays",
  thursdays: "Thursdays",
  fridays: "Fridays",
  saturdays: "Saturdays",
  recipe: "Recipe",
  openFromApp: "Open this from the app.",
  // Before the cook's invite link, in Telegram's picker (specs/260).
  getMealsHere: "Get the day's meals from me here:",
  // Setup's "What do you cook?" (specs/263).
  whatDoYouCook: "What do you cook?",
  whatDoYouCookBody: "Tick what your family cooks. You can change it later.",
  chooseAtLeastOne: "Choose at least one.",
};
