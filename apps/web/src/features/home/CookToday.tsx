import {
  Button,
  Cluster,
  ItemList,
  Pick,
  Reasons,
  Section,
  Tiles,
} from "@cookto/ui";
import { useState } from "react";
import { ChildDish } from "./ChildDish.js";
import { useCookToday } from "./useCookToday.js";

/** Cook today: a pick per meal, and why (specs/72, 80); each dish opens (#95). */
export function CookToday() {
  const c = useCookToday();
  const [more, setMore] = useState<ReadonlySet<string>>(new Set());
  if (!c) return null;
  return (
    <Section title={c.title}>
      <Tiles>
        {c.meals.map((meal) => (
          <Pick
            key={meal.slot}
            label={meal.label}
            dish={meal.best.dish}
            {...(meal.best.note ? { note: meal.best.note } : {})}
            onOpen={meal.best.onOpen}
          >
            <Reasons items={meal.best.reasons} />
            {meal.cooked ? (
              <Cluster gap={2}>
                <Reasons
                  items={[{ key: "made", text: c.madeWords, tone: "good" }]}
                />
                {c.canMark && (
                  <Button kind="plain" onClick={meal.onUndo}>
                    {c.undo}
                  </Button>
                )}
              </Cluster>
            ) : (
              c.canMark && (
                <div>
                  <Button kind="quiet" icon="check" onClick={meal.onCooked}>
                    {c.madeLabel}
                  </Button>
                </div>
              )
            )}
            <ChildDish slot={meal.slot} />
            {meal.others.length > 0 &&
              (more.has(meal.slot) ? (
                <div>
                  <ItemList label={c.otherIdeas} items={meal.others} />
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
      </Tiles>
    </Section>
  );
}
