import { addDays } from "@cookto/engine";
import { dayWords } from "@cookto/engine/time";
import { ranOut } from "../household/meals.js";
import { dayOff } from "../household/settings-write.js";
import { iso } from "../messenger/deps.js";
import type { Action } from "./deps.js";
import { say } from "./tomorrow.js";

// What the commands' buttons and answers do (specs/270): /off makes a day
// off and tells the cook; /ranout puts what ran out on the shopping list,
// and the planners hear it when the cook said it.

export const COMMAND_ACTIONS: Record<string, Action> = {
  offDay: async ({ run, key, input, d }) => {
    const ahead = input.kind === "button" && input.key === "after" ? 2 : 1;
    const day = addDays(String(run.about.today), ahead);
    await dayOff(d.households, run.household, day, iso(d.now()));
    const name = dayWords(day, "en", { weekday: "long" });
    if (run.workflow === "off_day")
      await say(d, run, key, "cook_off_day", "cooks", { day: name });
    return { day: name };
  },
  ranOutSaid: async ({ run, key, input, d }) => {
    const text = input.kind === "text" ? input.text.trim() : "";
    const now = () => iso(d.now());
    const foods = await ranOut(d.households, run.household, text, now, d.packs);
    if (foods.length > 0)
      await say(d, run, key, "check_added", run.audience, {
        foods: foods.map((f) => f.toLocaleLowerCase("en")).join(", "),
      });
    if (run.about.fromCook !== true) return;
    await d.households.reachPlanners(
      run.household,
      d.messenger.channel.name,
      now(),
    );
    await say(d, run, key, "ranout_told", "planners", {
      Cook: run.about.Cook,
      food: text,
    });
  },
};
