import { iso, type MessengerDeps } from "../messenger/deps.js";
import { begin } from "./engine.js";
import { runId } from "./tomorrow.js";

// Starting in Telegram (specs/260): a household just started tells its
// planners, in the chat they signed in from, that it's set up. Its run's id
// comes from the household, so it's said once however often it's asked.

export async function setUp(
  d: MessengerDeps,
  household: string,
): Promise<void> {
  const w = d.workflows;
  if (!w || w.off) return;
  const id = runId(`${household}:set_up`);
  if (await w.runs.get(id)) return;
  const now = iso(d.now());
  await d.households.reachPlanners(household, d.messenger.channel.name, now);
  const run = await w.runs.create({
    id,
    household,
    audience: "planners",
    workflow: "set_up",
    about: {},
    dueAt: now,
    expiresAt: null,
    now,
  });
  await begin(d, run);
}
