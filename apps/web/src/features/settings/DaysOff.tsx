import { Chip, Cluster, Field, Section, Select, Stack } from "@cookto/ui";
import { useDaysOff } from "./useDaysOff.js";

/**
 * The cook's days off (specs/240), on her row in Household: weekdays as
 * chips, the single dates as ticked chips that a tap takes off, and a date
 * to add from the weeks ahead.
 */
export function DaysOff() {
  const s = useDaysOff();
  return (
    <Section title={s.title}>
      <Stack gap={2}>
        <Cluster>
          {s.weekdays.map((d) => (
            <Chip key={d.key} pressed={d.pressed} onClick={d.toggle}>
              {d.label}
            </Chip>
          ))}
        </Cluster>
        {s.dates.length > 0 && (
          <Cluster>
            {s.dates.map((d) => (
              <Chip key={d.key} pressed onClick={d.remove}>
                {d.label}
              </Chip>
            ))}
          </Cluster>
        )}
        <Field label={s.addLabel}>
          {(control) => (
            <Select
              {...control}
              value=""
              onChange={(e) => {
                s.add(e.target.value);
              }}
            >
              <option value="" />
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Stack>
    </Section>
  );
}
