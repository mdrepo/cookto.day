import { Chip, Cluster, Stack } from "@cookto/ui";
import { useCuisinesStep } from "./useCuisinesStep.js";

export function CuisinesStep() {
  const c = useCuisinesStep();
  return (
    <Stack gap={3}>
      <Cluster gap={2}>
        {c.cuisines.map((x) => (
          <Chip
            key={x.id}
            pressed={x.pressed}
            disabled={x.disabled}
            onClick={x.toggle}
          >
            {x.label}
          </Chip>
        ))}
      </Cluster>
      {c.none && <p>{c.none}</p>}
    </Stack>
  );
}
