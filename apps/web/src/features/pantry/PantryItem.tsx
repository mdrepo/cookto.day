import {
  Button,
  Card,
  Cluster,
  Field,
  Input,
  Select,
  Stack,
  Tag,
} from "@cookto/ui";
import { usePantryItem } from "./usePantryItem.js";

/** One fresh item: how much, when to use it, and how it is (specs/72). */
export function PantryItem({ id }: { id: string }) {
  const p = usePantryItem(id);
  if (!p) return null;
  const { change, howItIs } = p;
  return (
    <Card title={p.name}>
      <Stack gap={3}>
        <Cluster gap={2}>
          {p.line && <span>{p.line}</span>}
          {p.warning && <Tag tone="warn">{p.warning}</Tag>}
        </Cluster>
        {change.editing ? (
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
              <Cluster>
                <Button kind="quiet" type="submit">
                  {change.saveLabel}
                </Button>
              </Cluster>
            </Stack>
          </form>
        ) : (
          <Cluster gap={2}>
            <Field label={howItIs.label} id={`how-${id}`} layout="inline">
              {(control) => (
                <Select
                  {...control}
                  value={howItIs.value}
                  onChange={(e) => {
                    howItIs.set(e.currentTarget.value);
                  }}
                >
                  {howItIs.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button kind="quiet" onClick={change.start}>
              {change.label}
            </Button>
            <Button kind="plain" onClick={p.usedUp.run}>
              {p.usedUp.label}
            </Button>
          </Cluster>
        )}
      </Stack>
    </Card>
  );
}
