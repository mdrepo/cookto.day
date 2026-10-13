import { TabBar } from "@cookto/ui";
import type { Route } from "../../routes.js";
import { useTabs } from "./useTabs.js";

/** The bar at the bottom of Today, the pantry and the dishes. */
export function Tabs({ current }: { current: Route }) {
  const t = useTabs(current);
  return <TabBar label={t.label} tabs={t.tabs} onPick={t.onPick} />;
}
