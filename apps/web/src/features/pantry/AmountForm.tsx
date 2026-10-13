import { Button, Cluster, Field, Input, Select, Stack } from "@cookto/ui";

interface Change {
  amountLabel: string;
  unitLabel: string;
  saveLabel: string;
  unit: string;
  units: readonly { value: string; label: string }[];
  save: (typed: string, unit: string) => void;
}

/** A new amount for one item, in the units people type. */
export function AmountForm({ id, change }: { id: string; change: Change }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const text = (key: string) => {
          const value = form.get(key);
          return typeof value === "string" ? value : "";
        };
        change.save(text("amount"), text("unit"));
      }}
    >
      <Stack gap={3}>
        <Cluster gap={3}>
          <Field label={change.amountLabel} id={`amount-${id}`}>
            {(control) => (
              <Input {...control} name="amount" inputMode="decimal" />
            )}
          </Field>
          <Field label={change.unitLabel} id={`unit-${id}`}>
            {(control) => (
              <Select {...control} name="unit" defaultValue={change.unit}>
                {change.units.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Cluster>
        <Button type="submit">{change.saveLabel}</Button>
      </Stack>
    </form>
  );
}
