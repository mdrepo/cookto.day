// English, the household's schedule (specs/240): meal times, the time zone
// and the cook's days off; and pages the bot opens inside Telegram
// (specs/241). On its own so en.ts stays under its size; en.ts spreads it
// in, and the other languages have these keys too.

export const enSchedule = {
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
};
