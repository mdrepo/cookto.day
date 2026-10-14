import { Button } from "@cookto/ui";
import { useCookNow } from "./useCookNow.js";

/** "You can cook 5 dishes now", which opens them (#97). */
export function CookNow() {
  const c = useCookNow();
  if (!c) return null;
  return (
    <Button kind="quiet" icon="cooking-pot" onClick={c.onOpen}>
      {c.label}
    </Button>
  );
}
