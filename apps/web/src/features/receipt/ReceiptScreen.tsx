import {
  ActionBar,
  Button,
  CheckList,
  Chip,
  Cluster,
  Rows,
  Screen,
  Stack,
} from "@cookto/ui";
import type { ReactNode } from "react";
import { useFound } from "./useFound.js";
import { type Phase, useReceiptScreen } from "./useReceiptScreen.js";

/** "Found in your receipt": what to add, and what it isn't sure of. */
function Found({ phase }: { phase: Extract<Phase, { kind: "found" }> }) {
  const f = useFound(phase.receipt, phase.rows);
  return (
    <>
      <CheckList label={f.foundLabel} items={f.found} />
      {f.notSure.length > 0 && (
        <Rows
          label={f.notSureLabel}
          rows={f.notSure.map((n) => ({
            key: n.key,
            label: n.line,
            value: (
              <Cluster gap={2}>
                {n.choices.map((c) => (
                  <Chip key={c.label} pressed={c.pressed} onClick={c.run}>
                    {c.label}
                  </Chip>
                ))}
              </Cluster>
            ),
          }))}
        />
      )}
      <ActionBar>
        <Button disabled={f.add.disabled} onClick={f.add.run}>
          {f.add.label}
        </Button>
      </ActionBar>
    </>
  );
}

/** A receipt photo: asked first, read, found, or what stopped it (specs/129). */
export function ReceiptScreen({ bar }: { bar: ReactNode }) {
  const s = useReceiptScreen();
  const { phase } = s;
  return (
    <Screen bar={bar} title={s.title}>
      <Cluster>
        <Button kind="plain" icon="arrow-left" onClick={s.back.run}>
          {s.back.label}
        </Button>
      </Cluster>
      {phase.kind === "ask" && (
        <Stack gap={3}>
          <p>{s.ask.text}</p>
          <ActionBar>
            <Button onClick={s.ask.run}>{s.ask.label}</Button>
          </ActionBar>
        </Stack>
      )}
      {phase.kind === "reading" && <p>{s.reading}</p>}
      {phase.kind === "found" && <Found phase={phase} />}
      {s.stopped && (
        <Stack gap={3}>
          <p>{s.stopped}</p>
          <Cluster>
            <Button kind="quiet" onClick={s.tap.run}>
              {s.tap.label}
            </Button>
          </Cluster>
        </Stack>
      )}
    </Screen>
  );
}
