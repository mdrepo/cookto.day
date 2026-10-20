import {
  Button,
  Cluster,
  LinkOut,
  Note,
  Section,
  Sheet,
  Stack,
  Tag,
} from "@cookto/ui";
import { useSignIn } from "./useSignIn.js";

/**
 * Sign in with Telegram (specs/216), on any phone: one line about what's
 * kept, a code and the bot's link, then the name and "Sign out".
 */
export function SignIn() {
  const s = useSignIn();
  return (
    <Section title={s.title}>
      <Stack gap={3}>
        {s.signedIn !== null ? (
          <Cluster>
            <Tag>{s.signedInWords}</Tag>
            <Button kind="plain" onClick={s.signOut.run} busy={s.busy}>
              {s.signOut.label}
            </Button>
          </Cluster>
        ) : s.step.kind === "idle" ? (
          <>
            {s.signedOutNote !== null && <Note>{s.signedOutNote}</Note>}
            <Cluster>
              <Button onClick={s.start.run}>{s.start.label}</Button>
            </Cluster>
          </>
        ) : s.step.kind === "explain" ? (
          <>
            <Note>{s.privacyLine}</Note>
            <Cluster>
              <Button onClick={s.go.run} busy={s.busy}>
                {s.go.label}
              </Button>
            </Cluster>
          </>
        ) : s.step.kind === "code" ? (
          <>
            <p>
              <output aria-label={s.title}>{s.code}</output>
            </p>
            <LinkOut href={s.link}>{s.openTelegram}</LinkOut>
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
      <Sheet
        open={s.question !== null}
        title={s.title}
        closeLabel={s.closeLabel}
        onClose={s.question?.notNow.run ?? (() => undefined)}
      >
        <Stack gap={3}>
          <p>{s.question?.text}</p>
          <Cluster>
            <Button onClick={s.question?.replace.run ?? (() => undefined)}>
              {s.question?.replace.label}
            </Button>
            <Button
              kind="plain"
              onClick={s.question?.notNow.run ?? (() => undefined)}
            >
              {s.question?.notNow.label}
            </Button>
          </Cluster>
        </Stack>
      </Sheet>
    </Section>
  );
}
