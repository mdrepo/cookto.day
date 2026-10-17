import { Button, Cluster, Field, Select, Sheet, Stack, Tag } from "@cookto/ui";
import { AmountForm } from "./AmountForm.js";
import { usePantryItem } from "./usePantryItem.js";

/**
 * One item's sheet: how it is, its amount, used up (specs/80, criterion 5),
 * and the dishes that use it (#105).
 */
export function ItemSheet({
  id,
  onClose,
  onUsedUp,
}: {
  id: string;
  onClose: () => void;
  /** After "Used up", with the food's name: the Fridge offers Undo (#116). */
  onUsedUp?: (id: string, name: string) => void;
}) {
  const p = usePantryItem(id, onClose, onUsedUp);
  if (!p) return null;
  const { change, howItIs } = p;
  return (
    <Sheet open title={p.name} closeLabel={p.closeLabel} onClose={onClose}>
      <Stack gap={4}>
        {(p.line || p.warning) && (
          <Cluster gap={2}>
            {p.line && <span>{p.line}</span>}
            {p.warning && <Tag tone="warn">{p.warning}</Tag>}
          </Cluster>
        )}
        <Field label={howItIs.label} id={`how-${id}`}>
          {(control) => (
            <Select
              {...control}
              wide
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
        {change.editing ? (
          <AmountForm id={id} change={change} />
        ) : (
          <Cluster gap={2} fill>
            <Button kind="quiet" onClick={change.start}>
              {change.label}
            </Button>
            <Button kind="danger" onClick={p.usedUp.run}>
              {p.usedUp.label}
            </Button>
          </Cluster>
        )}
        {p.dishesWith && (
          <Button kind="plain" icon="cooking-pot" onClick={p.dishesWith.open}>
            {p.dishesWith.label}
          </Button>
        )}
      </Stack>
    </Sheet>
  );
}
