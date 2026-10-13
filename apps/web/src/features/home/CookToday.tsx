import { Button, Pick, Reasons, Rows, Section, Stack } from "@cookto/ui";
import { useState } from "react";
import { useCookToday } from "./useCookToday.js";

/** Cook today: a pick per meal, and why (specs/72, 80). */
export function CookToday() {
  const c = useCookToday();
  const [more, setMore] = useState<ReadonlySet<string>>(new Set());
  if (!c) return null;
  return (
    <Section title={c.title}>
      <Stack gap={4}>
        {c.meals.map((meal) => (
          <Pick
            key={meal.slot}
            label={meal.label}
            dish={meal.best.dish}
            {...(meal.best.note ? { note: meal.best.note } : {})}
          >
            <Reasons items={meal.best.reasons} />
            {meal.others.length > 0 &&
              (more.has(meal.slot) ? (
                <div>
                  <Rows label={c.otherIdeas} rows={meal.others} />
                </div>
              ) : (
                <div>
                  <Button
                    kind="plain"
                    onClick={() => {
                      setMore((now) => new Set(now).add(meal.slot));
                    }}
                  >
                    {c.otherIdeas}
                  </Button>
                </div>
              ))}
          </Pick>
        ))}
      </Stack>
    </Section>
  );
}
