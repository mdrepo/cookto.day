import { Button, Card, Cluster, Field, Input, Select, Stack } from "@cookto/ui";
import { TapBought } from "./TapBought.js";
import { useAddFood } from "./useAddFood.js";

/** A labelled choice from a few, the first chosen to start. */
function Dropdown({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Field label={label} id={`food-${name}`}>
      {(control) => (
        <Select {...control} name={name} defaultValue={options[0]?.value}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

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
            where: text(form, "where"),
          });
        }}
      >
        <Stack gap={3}>
          <Cluster>
            <Button
              type="button"
              kind="quiet"
              icon="plus"
              onClick={a.receipt.run}
            >
              {a.receipt.label}
            </Button>
          </Cluster>
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
          <Dropdown label={a.boughtLabel} name="bought" options={a.days} />
          <Dropdown label={a.whereLabel} name="where" options={a.places} />
          <Cluster>
            <Button type="submit">{a.addLabel}</Button>
          </Cluster>
        </Stack>
      </form>
    </Card>
  );
}
