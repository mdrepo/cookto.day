import { Button, Card, Chip, Cluster, Field, Input, Tag } from "@cookto/ui";
import { usePersonCard } from "./usePersonCard.js";

/**
 * One person: open, with their name and meals, or folded to one line that
 * opens it (#114).
 */
export function PersonCard({
  id,
  open,
  onOpen,
}: {
  id: string;
  open: boolean;
  onOpen: () => void;
}) {
  const p = usePersonCard(id);
  if (!p.shown) return null;
  return (
    <Card
      title={p.title}
      {...(open ? {} : { folded: { summary: p.summary, onOpen } })}
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
            enterKeyHint="done"
            onKeyDown={(e) => {
              // Done on a phone's keyboard closes it, instead of going on.
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.currentTarget.blur();
            }}
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
