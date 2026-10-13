import { Card, Rows, Stack } from "@cookto/ui";
import { useId } from "react";
import { useCookToday } from "./useCookToday.js";

/** Cook today: for each meal, the dishes that use what needs using first. */
export function CookToday() {
  const c = useCookToday();
  const titleId = useId();
  if (!c) return null;
  return (
    <section aria-labelledby={titleId}>
      <Stack gap={3}>
        <h2 id={titleId}>{c.title}</h2>
        {c.meals.map((meal) => (
          <Card key={meal.slot} title={meal.title}>
            <Rows rows={meal.rows} />
          </Card>
        ))}
      </Stack>
    </section>
  );
}
