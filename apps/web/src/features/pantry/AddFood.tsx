import { Button, Card, Cluster, Field, Input, Select, Stack } from "@cookto/ui";
import { TapBought } from "./TapBought.js";
import { useAddFood } from "./useAddFood.js";

/** Add food: tap what you bought (specs/113), or type it (specs/72). */
export function AddFood({ onDone }: { onDone: () => void }) {
  const a = useAddFood(onDone);
  const text = (form: FormData, key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  return (
    <Card title={a.title} level={2}>
      <form
        aria-label={a.title}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void a.add({
            name: text(form, "name"),
            amount: text(form, "amount"),
            unit: text(form, "unit"),
            daysAgo: text(form, "bought"),
          });
        }}
      >
        <Stack gap={3}>
          <TapBought label={a.tapLabel} fresh={a.fresh} />
          <Field label={a.nameLabel} id="food-name">
            {(control) => (
              <Input
                {...control}
                name="name"
                required={a.nameRequired}
                onChange={(e) => {
                  a.onType(e.currentTarget.value);
                }}
              />
            )}
          </Field>
          <Cluster gap={3}>
            <Field label={a.amountLabel} id="food-amount">
              {(control) => (
                <Input {...control} name="amount" inputMode="decimal" />
              )}
            </Field>
            <Field label={a.unitLabel} id="food-unit">
              {(control) => (
                <Select {...control} name="unit" defaultValue="g">
                  {a.units.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Cluster>
          <Field label={a.boughtLabel} id="food-bought">
            {(control) => (
              <Select {...control} name="bought" defaultValue="0">
                {a.days.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Cluster>
            <Button type="submit">{a.addLabel}</Button>
          </Cluster>
        </Stack>
      </form>
    </Card>
  );
}
