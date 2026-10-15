import { Button, Callout, Cluster, Logo } from "@cookto/ui";
import { useWords } from "../../i18n/useWords.js";
import { useKitchenSetup } from "../../setup.js";
import { useKitchenStart } from "./useKitchenStart.js";

// Today's ways into the kitchen (specs/72, 80): the sample or the empty
// kitchen as a warm card, or, once there's food, quiet buttons at the end.

function useButtons() {
  const k = useKitchenStart();
  const choose = (kind: "main" | "quiet") => (
    <Button kind={kind} onClick={k.choose.onClick}>
      {k.choose.label}
    </Button>
  );
  const trySample = k.trySample && (
    <Button kind="quiet" onClick={k.trySample.onClick}>
      {k.trySample.label}
    </Button>
  );
  const { t } = useWords();
  return { k, t, choose, trySample };
}

/** Staples in, but nothing fresh: the next step is what you bought (#115). */
function NoFreshFood() {
  const { t } = useWords();
  const setup = useKitchenSetup();
  const fresh = setup.steps.find((s) => s.key === "fresh");
  if (!setup.hasStaples || setup.hasFresh || !fresh) return null;
  return (
    <Callout
      title={t.noFreshYet}
      art={<Logo />}
      actions={<Button onClick={fresh.onPress}>{fresh.label}</Button>}
    >
      {t.noFreshBody}
    </Callout>
  );
}

/** The sample kitchen's card, the empty kitchen's, or the next step's. */
export function KitchenCards() {
  const { k, t, choose, trySample } = useButtons();
  return (
    <>
      {!k.sample && !k.empty && <NoFreshFood />}
      {k.sample && (
        <Callout
          title={k.sample.tag}
          art={<Logo />}
          actions={
            <>
              {choose("main")}
              <Button kind="quiet" onClick={k.sample.onClear}>
                {k.sample.clear}
              </Button>
            </>
          }
        >
          {k.sample.body}
        </Callout>
      )}
      {k.empty && (
        <Callout
          title={t.emptyTitle}
          art={<Logo />}
          actions={
            <>
              {choose("main")}
              {trySample}
            </>
          }
        >
          {t.emptyBody}
        </Callout>
      )}
    </>
  );
}

/** Choose what you cook, and the sample, once the kitchen has food. */
export function KitchenMore() {
  const { k, choose, trySample } = useButtons();
  return (
    <>
      {!k.empty && !k.sample && (
        <Cluster gap={2}>
          {choose("quiet")}
          {trySample}
        </Cluster>
      )}
    </>
  );
}
