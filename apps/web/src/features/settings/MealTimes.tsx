import { Field, Section, Select, Stack } from "@cookto/ui";
import { useMealTimes } from "./useMealTimes.js";

/** Meal times (specs/240): a time for each meal the household eats. */
export function MealTimes() {
  const s = useMealTimes();
  return (
    <Section title={s.title}>
      <Stack gap={2}>
        {s.meals.map((m) => (
          <Field
            key={m.slot}
            label={m.label}
            layout="inline"
            {...(m.problem !== undefined && { problem: m.problem })}
          >
            {(control) => (
              <Select
                {...control}
                value={m.value}
                onChange={(e) => {
                  m.choose(e.target.value);
                }}
              >
                {m.options.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ))}
      </Stack>
    </Section>
  );
}
