import type { ReactNode } from "react";
import { Icon, ItemList, Screen } from "@cookto/ui";
import { useMoreScreen } from "./useMoreScreen.js";

/** More (specs/175): the packs and Settings, a row each. */
export function MoreScreen({ bar }: { bar: ReactNode }) {
  const s = useMoreScreen();
  return (
    <Screen bar={bar} title={s.title}>
      <ItemList
        label={s.title}
        items={s.rows.map((r) => ({
          key: r.key,
          name: r.name,
          media: <Icon name={r.icon} />,
          onOpen: r.onOpen,
        }))}
      />
    </Screen>
  );
}
