import { memoryRuns, type RunMember } from "@cookto/db";
import type { Button, Event as Incoming, Message } from "@cookto/messenger";
import { EN } from "@cookto/templates";
import { createHousehold } from "../src/household/routes.js";
import { send } from "../src/messenger/send.js";
import { webhook } from "../src/messenger/webhook.js";
import { push } from "../src/household/sync.js";
import { ACTIONS } from "../src/workflows/actions.js";
import { tick } from "../src/workflows/engine.js";
import { STARTERS, WORKFLOWS } from "../src/workflows/registry.js";
import type { WorkflowDeps } from "../src/workflows/deps.js";
import { as, joined, MAYUR, signedInAs } from "./household-flow.js";
import { record } from "./household-support.js";
import { incoming } from "./messenger-flow.js";
import { harness, type Harness } from "./messenger-support.js";

// specs/241's household (ADR 0034): Mayur, a planner in Asia/Kolkata whose
// Telegram chat is his user id, as Telegram's private chats are; two
// adults eating lunch and dinner; tomorrow, Thursday 22 October, planned;
// the cook on Telegram. The real workflows, actions and starters, runs in
// memory, and a clock set in the household's own time.

export const TOMORROW = "2026-10-22";
export const PLANNER_CHAT = "42";
export const COOK_CHAT = "c-cook";

export const settingsRecord = (
  more: Record<string, unknown> = {},
  version = 1,
) =>
  record(
    "household-settings",
    "household",
    {
      kitchen: { cuisines: ["north-indian"], skip: [], sample: null },
      country: "IN",
      beans: "dried",
      sorted: null,
      timeZone: "Asia/Kolkata",
      mealTimes: {
        breakfast: "08:00",
        "morning-snack": "11:00",
        lunch: "13:00",
        "evening-snack": "17:00",
        dinner: "20:00",
      },
      daysOff: { weekdays: [], dates: [] },
      ...more,
    },
    version,
  );

const ADULTS = [
  record("members", "m-1", { kind: "adult", meals: ["lunch", "dinner"] }),
  record("members", "m-2", { kind: "adult", meals: ["lunch", "dinner"] }),
];

export const planRecord = (
  slot: string,
  dish: string,
  version = 1,
  on = TOMORROW,
) =>
  record(
    "plans",
    `plan:${on}:${slot}`,
    { on, slot, dish, prep: null },
    version,
  );

const PLANS = [
  planRecord("lunch", "dal-tadka"),
  planRecord("dinner", "palak-paneer"),
];

/** "22:00" on the household's evening, 21 October in Kolkata. */
const kolkata = (hhmm: string, day = "2026-10-21") =>
  Date.parse(`${day}T${hhmm}:00+05:30`);

/** A delivery as the test reads it: its text and its buttons' labels. */
export interface Said {
  text: string;
  buttons: Button[];
}

const said = (m: Message): Said => ({
  text: "text" in m ? (m.text ?? "") : m.kind,
  buttons: m.kind === "buttons" ? m.buttons.flat() : [],
});

export interface Evening {
  h: Harness;
  w: WorkflowDeps;
  session: string;
  household: string;
  /** The household's clock, "22:00" on the evening or another day. */
  at: (hhmm: string, day?: string) => void;
  tick: () => Promise<void>;
  /** What reached a chat since the last look. */
  to: (chat: string) => Said[];
  /** Presses the button with this label on the last message to `chat`. */
  press: (chat: string, label: string) => Promise<void>;
  say: (chat: string, event: Incoming) => Promise<void>;
  /** Another phone's records, pushed as the phone would. */
  pushed: (...records: ReturnType<typeof record>[]) => Promise<void>;
  /** The app's "Looks good" with the cook in the household (specs/217). */
  appSends: (text: string) => Promise<void>;
  /** The server's copy of a record. */
  server: (collection: string, id: string) => Record<string, unknown> | null;
  botOff: () => Promise<void>;
}

let updates = 0;

/** The real workflows, actions and starters, runs in memory, on `h`. */
export function withWorkflows(h: Harness): WorkflowDeps {
  const members = (): RunMember[] =>
    h.households.members.map((m) => ({
      id: m.id,
      household: m.household,
      account: m.account,
      role: m.role,
      conversation: m.conversation,
    }));
  const w: WorkflowDeps = {
    runs: memoryRuns({
      members,
      households: () => new Set(h.households.rows.keys()),
      queue: async (outgoing) => {
        const ids: string[] = [];
        for (const o of outgoing)
          ids.push(
            await h.deps.messenger.send(o.conversation, o.message, {
              context: o.context,
            }),
          );
        return ids;
      },
    }),
    workflows: WORKFLOWS,
    actions: ACTIONS,
    starters: STARTERS,
    templates: { en: EN },
    off: false,
    leaseMs: 30_000,
  };
  h.deps.workflows = w;
  return w;
}

export async function evening(
  more: { settings?: Record<string, unknown>; plans?: boolean } = {},
): Promise<Evening> {
  const h = harness(new Date(kolkata("18:30")).toISOString());
  const session = await signedInAs(h, MAYUR, PLANNER_CHAT);
  const made = await createHousehold(
    as(session, "POST", "/api/household", {
      records: [
        settingsRecord(more.settings),
        ...ADULTS,
        ...(more.plans === false ? [] : PLANS),
      ],
    }),
    h.deps,
  );
  const { id: household } = (await made.json()) as { id: string };
  await joined(h, session, "cook", COOK_CHAT);
  const w = withWorkflows(h);
  h.channel.deliveries.length = 0;
  const event = async (chat: string, e: Incoming) => {
    const u = h.channel.update({
      id: `u-tm-${String(++updates)}`,
      chat,
      event: e,
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
  };
  const seen = new Map<string, number>();
  return {
    h,
    w,
    session,
    household,
    at: (hhmm, day) => {
      h.clock.now = kolkata(hhmm, day);
    },
    tick: async () => {
      await tick(h.deps);
      await h.settle();
    },
    to: (chat) => {
      const all = h.channel.deliveries.filter((d) => d.chat === chat);
      const from = seen.get(chat) ?? 0;
      seen.set(chat, all.length);
      return all.slice(from).map((d) => said(d.message));
    },
    press: async (chat, label) => {
      const last = h.channel.deliveries
        .filter((d) => d.chat === chat && d.message.kind === "buttons")
        .at(-1);
      const buttons = last ? said(last.message).buttons : [];
      const b = buttons.find((x) => x.label === label);
      if (!b || !("value" in b)) throw new Error(`no button "${label}"`);
      await event(chat, { kind: "button", value: b.value, answers: null });
    },
    say: event,
    pushed: async (...records) => {
      await push(as(session, "POST", "/api/sync/push", { records }), h.deps);
    },
    appSends: async (text) => {
      await send(
        as(session, "POST", "/api/messenger/send", {
          text,
          context: `plan:${TOMORROW}`,
        }),
        h.deps,
      );
      await h.settle();
    },
    server: (collection, id) =>
      h.households.records.find(
        (r) =>
          r.household === household &&
          r.collection === collection &&
          r.id === id,
      )?.record ?? null,
    botOff: async () => {
      const account = h.households.members.find(
        (m) => m.role === "plan",
      )?.account;
      await w.runs.setBotOff(account ?? "", true);
      const row = h.households.rows.get(household);
      if (row) row.botOff = true;
    },
  };
}
