import {
  Button,
  Cluster,
  JoinCode,
  Note,
  Section,
  Sheet,
  Stack,
  Tag,
} from "@cookto/ui";
import { useCookLink } from "./useCookLink.js";

type Link = NonNullable<ReturnType<typeof useCookLink>>;

/** The sheet's steps: the line about Telegram, the code, or it ran out. */
function ConnectSteps({ s }: { s: Link }) {
  if (s.step.kind === "explain")
    return (
      <>
        <p>{s.privacyLine}</p>
        <Cluster>
          <Button onClick={s.connect.run} busy={s.busy}>
            {s.connect.label}
          </Button>
        </Cluster>
      </>
    );
  if (s.step.kind === "code")
    return (
      <>
        <JoinCode
          code={s.code ?? ""}
          label={s.title}
          qr={s.qr}
          qrLabel={s.qrLabel}
        />
        <Cluster>
          <Button onClick={s.sendLink.run}>{s.sendLink.label}</Button>
        </Cluster>
        <p>{s.startLine}</p>
        <Note>{s.waiting}</Note>
      </>
    );
  return (
    <>
      <Note>{s.ranOut}</Note>
      <Cluster>
        <Button onClick={s.tryAgain.run} busy={s.busy}>
          {s.tryAgain.label}
        </Button>
      </Cluster>
    </>
  );
}

/**
 * The cook's Telegram (specs/207): connect once, from the planner's phone,
 * in a sheet; a code she sends the bot, or scans; connected, or disconnect.
 */
export function CookLink() {
  const s = useCookLink();
  if (!s) return null;
  return (
    <Section title={s.title}>
      <Stack gap={3}>
        {s.connected ? (
          <Cluster>
            <Tag>{s.connectedWords}</Tag>
            <Button kind="plain" onClick={s.disconnect.run} busy={s.busy}>
              {s.disconnect.label}
            </Button>
          </Cluster>
        ) : (
          <Cluster>
            <Button onClick={s.start.run}>{s.start.label}</Button>
          </Cluster>
        )}
      </Stack>
      <Sheet
        open={!s.connected && s.step.kind !== "idle"}
        title={s.title}
        closeLabel={s.closeLabel}
        onClose={s.close}
      >
        <Stack gap={3}>
          {s.step.kind !== "idle" && <ConnectSteps s={s} />}
        </Stack>
      </Sheet>
    </Section>
  );
}
