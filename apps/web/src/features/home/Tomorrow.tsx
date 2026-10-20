import {
  Button,
  Cluster,
  ItemList,
  Note,
  Pick,
  Reasons,
  Rows,
  Section,
  Stack,
  Tiles,
} from "@cookto/ui";
import { useState } from "react";
import { SendToCook } from "./SendToCook.js";
import { useTomorrow } from "./useTomorrow.js";

/**
 * Tomorrow, on the planner's phone (specs/144, 195, 207): the picks with
 * other ideas, "Looks good" and "Share tomorrow"; or, once sorted, the plan
 * in a few rows, with "Change". Under either, where it stands with the
 * cook. Loaded only on a phone that plans (HomeScreen), so the cook's never
 * fetches it.
 */
export function Tomorrow() {
  const s = useTomorrow();
  const [more, setMore] = useState<ReadonlySet<string>>(new Set());
  if (!s) return null;
  const share = (
    <Button kind="quiet" onClick={s.share.run}>
      {s.share.label}
    </Button>
  );
  return (
    <Section title={s.title}>
      <Stack gap={3}>
        {s.sorted ? (
          <>
            <Reasons
              items={[{ key: "sorted", text: s.sortedWords, tone: "good" }]}
            />
            <Rows label={s.title} rows={s.rows} />
          </>
        ) : (
          <Tiles>
            {s.meals.map((meal) => (
              <Pick
                key={meal.slot}
                label={meal.label}
                dish={meal.dish}
                onOpen={meal.onOpen}
              >
                {meal.others.length > 0 &&
                  (more.has(meal.slot) ? (
                    <div>
                      <ItemList label={s.otherIdeas} items={meal.others} />
                    </div>
                  ) : (
                    <div>
                      <Button
                        kind="plain"
                        onClick={() => {
                          setMore((now) => new Set(now).add(meal.slot));
                        }}
                      >
                        {s.otherIdeas}
                      </Button>
                    </div>
                  ))}
              </Pick>
            ))}
          </Tiles>
        )}
        {/* One place in the tree, so its state outlives "Looks good". */}
        <SendToCook {...s.cook} />
        <Cluster>
          {s.sorted ? (
            <Button kind="plain" onClick={s.change.run}>
              {s.change.label}
            </Button>
          ) : (
            <Button onClick={s.looksGood.run}>{s.looksGood.label}</Button>
          )}
          {share}
        </Cluster>
        {s.share.copied && <Note>{s.share.copied}</Note>}
      </Stack>
    </Section>
  );
}
