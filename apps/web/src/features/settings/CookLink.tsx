import { Button, Cluster, Note, Section, Stack, Tag } from "@cookto/ui";
import { useCookLink } from "./useCookLink.js";

/**
 * The cook's Telegram (specs/207): connect once, from the planner's phone;
 * a code she sends the bot; connected, or disconnect.
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
        ) : s.step.kind === "idle" ? (
          <Cluster>
            <Button onClick={s.start.run}>{s.start.label}</Button>
          </Cluster>
        ) : s.step.kind === "explain" ? (
          <>
            <Note>{s.privacyLine}</Note>
            <Cluster>
              <Button onClick={s.connect.run} busy={s.busy}>
                {s.connect.label}
              </Button>
            </Cluster>
          </>
        ) : s.step.kind === "code" ? (
          <>
            <p>
              <output aria-label={s.title}>{s.code}</output>
            </p>
            <Cluster>
              <Button onClick={s.sendLink.run}>{s.sendLink.label}</Button>
            </Cluster>
            <Note>{s.waiting}</Note>
          </>
        ) : (
          <>
            <Note>{s.ranOut}</Note>
            <Cluster>
              <Button onClick={s.tryAgain.run} busy={s.busy}>
                {s.tryAgain.label}
              </Button>
            </Cluster>
          </>
        )}
      </Stack>
    </Section>
  );
}
