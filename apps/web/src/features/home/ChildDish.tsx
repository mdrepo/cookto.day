import { Button, Cluster, ItemList, Reasons, Sheet } from "@cookto/ui";
import type { MealSlot } from "@cookto/engine";
import { useState } from "react";
import { useChildDishes } from "./useChildDishes.js";

/**
 * Under a meal's pick: the child's own dish, with its add-ins and "Remove",
 * or a way to add one from the child's list (specs/145).
 */
export function ChildDish({ slot }: { slot: MealSlot }) {
  const c = useChildDishes();
  const [choosing, setChoosing] = useState(false);
  const meal = c?.forSlot(slot);
  if (!c || !meal) return null;
  if (meal.planned)
    return (
      <div role="group" aria-label={meal.planned.label}>
        <Reasons
          items={[{ key: "child", text: meal.planned.text, tone: "quiet" }]}
        />
        <Cluster gap={2}>
          <Button kind="plain" onClick={meal.planned.open.run}>
            {meal.planned.open.label}
          </Button>
          {meal.planned.actions.map((a) => (
            <Button key={a.label} kind="plain" onClick={a.run}>
              {a.label}
            </Button>
          ))}
        </Cluster>
      </div>
    );
  return (
    <div>
      <Button
        kind="plain"
        onClick={() => {
          setChoosing(true);
        }}
      >
        {meal.add.label}
      </Button>
      <Sheet
        open={choosing}
        title={c.pickerTitle}
        closeLabel={c.close}
        onClose={() => {
          setChoosing(false);
        }}
      >
        <ItemList
          label={c.pickerTitle}
          items={meal.add.options.map((o) => ({
            ...o,
            onOpen: () => {
              o.onOpen();
              setChoosing(false);
            },
          }))}
        />
      </Sheet>
    </div>
  );
}
