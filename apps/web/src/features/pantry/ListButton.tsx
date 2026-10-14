import { Button } from "@cookto/ui";
import { useListCount } from "./useListCount.js";

/** The shopping list, at the top of the fridge (specs/103). */
export function ListButton() {
  const l = useListCount();
  if (!l) return null;
  return (
    <div>
      <Button kind="quiet" icon="shopping-cart" onClick={l.onOpen}>
        {l.label}
      </Button>
    </div>
  );
}
