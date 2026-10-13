import { Button, Pick, Reasons, Rows, Stack } from "@cookto/ui";
import { useId, useState } from "react";
import { useCookToday } from "./useCookToday.js";

/** Cook today: a pick per meal, and why (specs/72, 80). */
export function CookToday() {
  const c = useCookToday();
  const titleId = useId();
  const [more, setMore] = useState<ReadonlySet<string>>(new Set());
  if (!c) return null;
  return (
    <section aria-labelledby={titleId}>
      <Stack gap={3}>
        <h2 id={titleId}>{c.title}</h2>
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
    </section>
  );
}
