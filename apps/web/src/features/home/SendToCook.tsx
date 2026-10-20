import { Button, Reasons } from "@cookto/ui";
import { type SendProps, useSendToCook } from "./useSendToCook.js";

/**
 * Where tomorrow's plan stands with the cook (specs/207): one line, and
 * "Send again" or "Send to the cook" when there's something to do. Loaded
 * only once a cook is connected, so most phones never fetch it.
 */
export function SendToCook(props: SendProps) {
  const s = useSendToCook(props);
  if (!s.line && !s.button) return null;
  return (
    <>
      {s.line && <Reasons items={[{ key: "cook", ...s.line }]} />}
      {s.button && <Button onClick={s.button.run}>{s.button.label}</Button>}
    </>
  );
}
