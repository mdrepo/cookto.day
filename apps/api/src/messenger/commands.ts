import type { Received } from "@cookto/messenger";
import { EN, render } from "@cookto/templates";
import { createChanges, createShopping } from "@cookto/data";
import { cookWords, kitchenOf } from "../household/people.js";
import { householdStore } from "../household/record-store.js";
import { clockOf, schedule } from "../household/schedule.js";
import { CHANGE, householdPacks } from "../household/tomorrow-plan.js";
import { runId, startRun } from "../workflows/tomorrow.js";
import {
  type Asked,
  cooksTomorrow,
  plannersTomorrow,
  today,
} from "./command-days.js";
import { iso, type MessengerDeps } from "./deps.js";
import { withApp } from "./words.js";

// The commands (specs/270): answered in the chat, with buttons. A command
// comes from a member's chat; whose household it is, and as what, decide
// what it does. Someone with no household is asked to set one up; with the
// bot off, it says so; an unknown command says what to do.

type Handler = (a: Asked) => Promise<string>;

/** /list: what to buy, in one message. */
const list: Handler = async (a) => {
  const now = () => iso(a.d.now());
  const store = householdStore(a.d.households, a.household, now);
  const items = await createShopping(store, {
    changes: createChanges(),
    now,
  }).reader.items();
  const packs = await householdPacks(a.d.households, a.household, a.d.packs);
  const nameOf = (id: string) =>
    packs.map((p) => p.words.en?.ingredients[id]).find(Boolean) ?? id;
  const names = items.map((i) => nameOf(i.ingredient).toLocaleLowerCase("en"));
  if (names.length === 0) await a.answer("cmd_list_empty", { page: CHANGE });
  else await a.answer("cmd_list", { items: names.join(", "), page: CHANGE });
  return "list";
};

const off: Handler = async (a) => {
  const flow = a.k.hasCook ? "off_day" : "off_day_self";
  await a.answer(flow, {
    today: a.clock.day,
    ...cookWords(a.k, a.w.templates),
  });
  return "off";
};

const ranout =
  (fromCook: boolean): Handler =>
  async (a) => {
    const words = cookWords(a.k, a.w.templates);
    await a.answer("ranout", { fromCook, ...words });
    return "ranout";
  };

/** A command that asks its first question: who's out, how many guests. */
const asks =
  (workflow: string): Handler =>
  async (a) => {
    await a.answer(workflow, {});
    return workflow;
  };

/** /receipt: asks for the photo, which the next message brings (specs/277). */
const receipt: Handler = async (a) => {
  const lines = render(a.w.templates, "en", "receipt_send").text;
  await a.answer("cmd_said", { lines });
  return "receipt";
};

const PLANNER: Record<string, Handler> = {
  tomorrow: plannersTomorrow,
  today: (a) => today(a, false),
  out: asks("out_who"),
  guests: asks("guests_count"),
  off,
  list,
  receipt,
};
/** The planners cook: what was the cook's is theirs too. */
const SELF: Record<string, Handler> = { ...PLANNER, ranout: ranout(false) };
const COOK: Record<string, Handler> = {
  tomorrow: cooksTomorrow,
  today: (a) => today(a, true),
  ranout: ranout(true),
  receipt,
};

/** A reply within a conversation, sent at once; nothing to run. */
async function reply(d: MessengerDeps, conversation: string, id: string) {
  const text = render({ en: EN }, "en", id).text;
  await d.messenger.send(conversation, { kind: "text", text });
  d.after(d.messenger.drain());
}

export async function commanded(
  d: MessengerDeps,
  got: Received,
  name: string,
): Promise<string> {
  const { conversation, chat } = got;
  const member =
    conversation?.owner.kind === "member" ? conversation.owner.id : null;
  const who = member && (await d.households.whose(member).catch(() => null));
  if (!conversation || !member || !who) {
    await d.messenger.channel
      .deliver(chat, withApp("welcome"))
      .catch(() => undefined);
    return "command-stranger";
  }
  const w = d.workflows;
  const home = (await d.households.list()).find((h) => h.id === who.household);
  if (!w || w.off || home?.botOff) {
    await reply(d, conversation.id, "cmd_switched_off");
    return "command-off";
  }
  const s = await schedule(d.households, who.household);
  const clock = clockOf(s, iso(d.now()));
  const k = await kitchenOf(d.households, who.household);
  const seed = got.message?.id ?? String(d.now());
  const a: Asked = {
    d,
    w,
    household: who.household,
    k,
    s,
    clock: clock ?? { day: iso(d.now()).slice(0, 10), time: "12:00" },
    answer: (workflow, about) =>
      startRun(d, who.household, runId(`${member}:${workflow}:${seed}`), {
        workflow,
        audience: member,
        about,
      }),
  };
  const handlers = who.role === "cook" ? COOK : k.hasCook ? PLANNER : SELF;
  const handle = handlers[name];
  if (handle) return `command-${await handle(a)}`;
  await a.answer("cmd_said", {
    lines: render(w.templates, "en", "cmd_unknown").text,
  });
  return "command-unknown";
}
