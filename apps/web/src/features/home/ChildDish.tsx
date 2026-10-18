import { Button, ItemList, Reminders, Sheet } from "@cookto/ui";
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
  if (meal.planned) {
    const { label, text, open, actions } = meal.planned;
    return (
      <Reminders
        label={label}
        items={[
          {
            key: "child",
            text,
            actions: [open, ...actions].map((a) => ({
              label: a.label,
              onPress: a.run,
            })),
          },
        ]}
      />
    );
  }
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
