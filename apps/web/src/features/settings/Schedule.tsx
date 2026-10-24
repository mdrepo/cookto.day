import { DaysOff } from "./DaysOff.js";
import { MealTimes } from "./MealTimes.js";

/**
 * The household's schedule (specs/240), in Household: the cook's days off
 * once there's a cook, and meal times. Loaded when Household shows it.
 */
export function Schedule({ hasCook }: { hasCook: boolean }) {
  return (
    <>
      {hasCook && <DaysOff />}
      <MealTimes />
    </>
  );
}
