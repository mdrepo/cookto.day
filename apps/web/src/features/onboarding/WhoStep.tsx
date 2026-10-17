import { Button, Cluster, Stack } from "@cookto/ui";
import { PersonCard } from "./PersonCard.js";
import { useWhoStep } from "./useWhoStep.js";

export function WhoStep() {
  const w = useWhoStep();
  return (
    <Stack gap={3}>
      {w.ids.map((id) => (
        <PersonCard
          key={id}
          id={id}
          open={id === w.open}
          onOpen={() => {
            w.setOpen(id);
          }}
        />
      ))}
      {w.nobody && <p>{w.nobody}</p>}
      <Cluster gap={2}>
        {w.adders.map((a) => (
          <Button key={a.kind} kind="quiet" icon="plus" onClick={a.add}>
            {a.label}
          </Button>
        ))}
      </Cluster>
    </Stack>
  );
}
