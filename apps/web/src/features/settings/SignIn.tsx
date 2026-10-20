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
import { useSignIn } from "./useSignIn.js";

type SignInState = ReturnType<typeof useSignIn>;

/** The sheet's steps: the line about what's kept, the code, or it ran out. */
function SignInSteps({ s }: { s: SignInState }) {
  if (s.step.kind === "explain")
    return (
      <>
        <p>{s.privacyLine}</p>
        <Cluster>
          <Button onClick={s.go.run} busy={s.busy}>
            {s.go.label}
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
          <Button onClick={s.openTelegram.run}>{s.openTelegram.label}</Button>
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

/** Joining a household that already exists: replace this phone's kitchen? */
function JoinQuestion({ s }: { s: SignInState }) {
  const q = s.question;
  return (
    <Sheet
      open={q !== null}
      title={s.title}
      closeLabel={s.closeLabel}
      onClose={q?.notNow.run ?? (() => undefined)}
    >
      {q !== null && (
        <Stack gap={3}>
          <p>{q.text}</p>
          <Cluster>
            <Button onClick={q.replace.run}>{q.replace.label}</Button>
            <Button kind="plain" onClick={q.notNow.run}>
              {q.notNow.label}
            </Button>
          </Cluster>
        </Stack>
      )}
    </Sheet>
  );
}

/**
 * Sign in with Telegram (specs/216), on any phone: the steps in a sheet (a
 * dialog on a wide screen), then the name and "Sign out".
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
        ) : (
          <>
            {s.signedOutNote !== null && <p>{s.signedOutNote}</p>}
            <Cluster>
              <Button onClick={s.start.run}>{s.start.label}</Button>
            </Cluster>
          </>
        )}
      </Stack>
      <Sheet
        open={s.signedIn === null && s.step.kind !== "idle"}
        title={s.title}
        closeLabel={s.closeLabel}
        onClose={s.close}
      >
        <Stack gap={3}>{s.step.kind !== "idle" && <SignInSteps s={s} />}</Stack>
      </Sheet>
      <JoinQuestion s={s} />
    </Section>
  );
}
