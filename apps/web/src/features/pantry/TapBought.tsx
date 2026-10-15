import { Chip, Cluster, Stack } from "@cookto/ui";

/** "Tap what you bought": the loaded cuisines' fresh food (specs/113). */
export function TapBought({
  label,
  fresh,
}: {
  label: string;
  fresh: readonly {
    id: string;
    label: string;
    pressed: boolean;
    toggle: () => void;
  }[];
}) {
  if (fresh.length === 0) return null;
  return (
    <div role="group" aria-labelledby="food-tap">
      <Stack gap={2}>
        <p id="food-tap">{label}</p>
        <Cluster gap={2}>
          {fresh.map((f) => (
            <Chip key={f.id} pressed={f.pressed} onClick={f.toggle}>
              {f.label}
            </Chip>
          ))}
        </Cluster>
      </Stack>
    </div>
  );
}
