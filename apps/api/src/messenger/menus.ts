import type { Command } from "@cookto/messenger";
import { EN, render } from "@cookto/templates";
import { iso, type MessengerDeps } from "./deps.js";

// Each chat's command menu (specs/270): typing "/" shows its role's
// commands. Set when a chat connects, and again for the whole household
// when its cook comes or goes: planners who cook have /ranout too.

const PLANNER = ["tomorrow", "today", "out", "guests", "off", "list"];
const COOK = ["tomorrow", "today", "ranout"];

function menuOf(cook: boolean, planners: "cook" | "plan"): Command[] {
  const names = cook
    ? COOK
    : planners === "cook"
      ? [...PLANNER, "ranout"]
      : PLANNER;
  return names.map((command) => ({
    command,
    description: render({ en: EN }, "en", `menu_${command}`).text,
  }));
}

/** A planner's chat with no household yet: they'll cook until a cook comes. */
export async function setPlannerMenu(d: MessengerDeps, chat: string) {
  await d.messenger.channel
    .setCommands?.(chat, menuOf(false, "cook"))
    .catch(() => undefined);
}

/** Every chat of the household, its role's menu. */
export async function setMenus(d: MessengerDeps, household: string) {
  const channel = d.messenger.channel;
  if (!channel.setCommands) return;
  await d.households.reachPlanners(household, channel.name, iso(d.now()));
  // Before migration 0011 there's no list of people: no menus yet.
  const people = await d.households.people(household).catch(() => []);
  const hasCook = people.some((p) => p.role === "cook" && p.conversation);
  for (const p of people) {
    const c = p.conversation && (await d.messenger.store.get(p.conversation));
    if (!c) continue;
    const menu = menuOf(p.role === "cook", hasCook ? "plan" : "cook");
    await channel.setCommands(c.chat, menu).catch(() => undefined);
  }
}
