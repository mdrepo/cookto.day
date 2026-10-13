import { Button, Card, Chip, Cluster, Field, Input, Tag } from "@cookto/ui";
import { usePersonCard } from "./usePersonCard.js";

export function PersonCard({ id }: { id: string }) {
  const p = usePersonCard(id);
  if (!p.shown) return null;
  return (
    <Card
      title={p.title}
      action={
        <Button
          kind="plain"
          icon="x"
          label={p.removeLabel}
          onClick={p.remove}
        />
      }
    >
      {p.toddlerFood && (
        <Cluster gap={2}>
          <Tag>{p.toddlerFood}</Tag>
        </Cluster>
      )}
      <Field label={p.nameLabel} id={`name-${id}`}>
        {(control) => (
          <Input
            {...control}
            defaultValue={p.nickname}
            placeholder={p.kindName}
            onChange={(e) => {
              p.rename(e.currentTarget.value);
            }}
          />
        )}
      </Field>
      <div role="group" aria-label={p.mealsLabel}>
        <Cluster gap={2}>
          {p.meals.map((m) => (
            <Chip key={m.slot} pressed={m.pressed} onClick={m.toggle}>
              {m.label}
            </Chip>
          ))}
        </Cluster>
      </div>
    </Card>
  );
}
