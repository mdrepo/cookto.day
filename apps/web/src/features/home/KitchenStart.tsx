import { Button, Callout, Cluster, Logo } from "@cookto/ui";
import { useWords } from "../../i18n/useWords.js";
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

/** The sample kitchen's card, or the empty kitchen's. */
export function KitchenCards() {
  const { k, t, choose, trySample } = useButtons();
  return (
    <>
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
