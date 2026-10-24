import { addDays } from "@cookto/engine";
import { upcomingDaysOff } from "@cookto/engine/schedule";
import { addDayOff, removeDayOff, setDaysOff } from "@cookto/usecases/schedule";
import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { settings, shared, today } from "../../platform.js";

type ScheduleSettings = Awaited<ReturnType<typeof shared>>;
import { longDate, shortDate, WEEK, weekdayName } from "./daysOffWords.js";

// The cook's days off (specs/240), on her row in Household: the weekdays as
// chips, and single dates, picked from the weeks ahead. Dates past drop off.

/** How far ahead a single day off can be picked. */
const AHEAD_DAYS = 90;

export function useDaysOff() {
  const { t, locale } = useWords();
  const saved = useStore(settings.store, (s) => s.daysOff);
  const on = today();
  const daysOff = upcomingDaysOff(saved, on);
  const run = (step: (deps: { settings: ScheduleSettings }) => void) => {
    void shared().then((writer) => {
      step({ settings: writer });
    });
  };
  const ahead = Array.from({ length: AHEAD_DAYS }, (_, i) => addDays(on, i));
  return {
    title: t.daysOff,
    weekdays: WEEK.map((d) => {
      const pressed = daysOff.weekdays.includes(d);
      return {
        key: String(d),
        label: weekdayName(d, locale),
        pressed,
        toggle: () => {
          run((deps) => {
            setDaysOff(deps, d, !pressed);
          });
        },
      };
    }),
    dates: daysOff.dates.map((d) => ({
      key: d,
      label: shortDate(d, locale),
      remove: () => {
        run((deps) => {
          removeDayOff(deps, d);
        });
      },
    })),
    addLabel: t.addADate,
    options: ahead
      .filter((d) => !daysOff.dates.includes(d))
      .map((d) => ({ value: d, label: longDate(d, locale) })),
    add: (day: string) => {
      if (day)
        run((deps) => {
          addDayOff(deps, day);
        });
    },
  };
}
