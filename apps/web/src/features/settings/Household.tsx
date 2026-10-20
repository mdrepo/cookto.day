import {
  Button,
  Cluster,
  ItemList,
  Note,
  Section,
  Sheet,
  Stack,
} from "@cookto/ui";
import { useHousehold } from "./useHousehold.js";
import type { useInvite } from "./useInvite.js";

/** "Who?", then the code to share and the wait: an invite's steps. */
function InviteSteps({
  s,
  title,
}: {
  s: ReturnType<typeof useInvite>;
  /** Names the code for screen readers: the section's title. */
  title: string;
}) {
  if (s.invite.kind === "who")
    return (
      <>
        <Note>{s.who}</Note>
        <Cluster>
          {s.roles.map((r) => (
            <Button
              key={r.role}
              onClick={() => {
                s.chooseRole(r.role);
              }}
              busy={s.busy}
            >
              {r.label}
            </Button>
          ))}
        </Cluster>
      </>
    );
  return (
    <>
      <p>
        <output aria-label={title}>{s.code}</output>
      </p>
      <Cluster>
        <Button onClick={s.sendLink.run}>{s.sendLink.label}</Button>
      </Cluster>
      <Note>{s.waiting}</Note>
    </>
  );
}

/**
 * The household (specs/217), when signed in: who's in it, an invite by
 * role, leave, delete the account; "Start a household" when there's none.
 */
export function Household() {
  const s = useHousehold();
  if (!s) return null;
  return (
    <Section title={s.title}>
      <Stack gap={3}>
        {s.view === null ? (
          <Cluster>
            <Button onClick={s.start.run} busy={s.busy}>
              {s.start.label}
            </Button>
          </Cluster>
        ) : (
          <>
            <ItemList
              label={s.title}
              items={s.members.map((m) => ({
                key: m.key,
                name: m.name,
                ...(m.line !== undefined && { line: m.line }),
                onOpen: () => undefined,
                action: m.remove,
              }))}
            />
            {s.invite.invite.kind === "idle" ? (
              <Cluster>
                <Button onClick={s.invite.askWho} busy={s.busy}>
                  {s.invite.label}
                </Button>
                <Button kind="plain" onClick={s.deleteAccount.ask}>
                  {s.deleteAccount.label}
                </Button>
              </Cluster>
            ) : (
              <InviteSteps s={s.invite} title={s.title} />
            )}
          </>
        )}
      </Stack>
      <Sheet
        open={s.deleteAccount.confirming}
        title={s.deleteAccount.label}
        closeLabel={s.closeLabel}
        onClose={s.deleteAccount.cancel}
      >
        <Stack gap={3}>
          <p>{s.deleteAccount.line}</p>
          <Cluster>
            <Button kind="danger" onClick={s.deleteAccount.run}>
              {s.deleteAccount.label}
            </Button>
          </Cluster>
        </Stack>
      </Sheet>
    </Section>
  );
}
