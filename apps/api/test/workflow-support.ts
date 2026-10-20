import { memoryRuns, type NewRun, type RunMember } from "@cookto/db";
import type { Event as Incoming } from "@cookto/messenger";
import type { Event } from "@cookto/workflows";
import { PING, PING_TEMPLATES } from "@cookto/workflows/ping";
import { EN } from "@cookto/templates";
import { ACTIONS } from "../src/workflows/actions.js";
import { tick } from "../src/workflows/engine.js";
import { buttonValue } from "../src/workflows/buttons.js";
import type { WorkflowDeps } from "../src/workflows/deps.js";
import { webhook } from "../src/messenger/webhook.js";
import { home, joined } from "./household-flow.js";
import { incoming } from "./messenger-flow.js";
import { harness, type Harness } from "./messenger-support.js";

// What the engine's tests share (specs/234): the messenger harness, a
// household with Mayur and the cook, runs in memory over its members, the
// test workflow, and an action that counts what it was asked to do by key,
// so a repeat can be seen to change nothing.

export interface Engine {
  h: Harness;
  w: WorkflowDeps;
  account: string;
  session: string;
  cook: { member: string; chat: string; conversation: string };
  /** Each call of countsAsDone and passOn, and the keys they changed. */
  calls: { name: string; key: string; input: Event }[];
  changed: Set<string>;
  run: (more?: Partial<NewRun>) => Promise<string>;
  press: (value: string, chat?: string) => Promise<void>;
  say: (event: Incoming, chat?: string) => Promise<void>;
  /** The cron, and the sends it hands over. */
  tick: () => Promise<void>;
  /** What the fake channel delivered since the last look, as text. */
  said: () => string[];
}

const T0 = "2026-10-21T15:00:00.000Z";
let updates = 0;

export async function engine(): Promise<Engine> {
  const h = harness(T0);
  const { session } = await home(h);
  await joined(h, session, "cook", "c-cook");
  const members = (): RunMember[] =>
    h.households.members.map((m) => ({
      id: m.id,
      household: m.household,
      account: m.account,
      role: m.role,
      conversation: m.conversation,
    }));
  const cookRow = h.households.members.find((m) => m.role === "cook");
  const planner = h.households.members.find((m) => m.role === "plan");
  const calls: Engine["calls"] = [];
  const changed = new Set<string>();
  const counting =
    (name: string) =>
    ({ key, input }: { key: string; input: Event }) => {
      calls.push({ name, key, input });
      changed.add(`${name}:${key}`);
      return Promise.resolve();
    };
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
    workflows: { test_ping: PING },
    actions: {
      ...ACTIONS,
      passOn: counting("passOn"),
      countsAsDone: counting("countsAsDone"),
    },
    templates: { en: { ...EN, ...PING_TEMPLATES } },
    off: false,
    leaseMs: 30_000,
  };
  h.deps.workflows = w;
  h.channel.deliveries.length = 0;
  let n = 0;
  const cook = {
    member: cookRow?.id ?? "",
    chat: "c-cook",
    conversation: cookRow?.conversation ?? "",
  };
  const send = async (event: Incoming, chat: string) => {
    const u = h.channel.update({
      id: `u-engine-${String(++updates)}`,
      chat,
      event,
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
  };
  return {
    h,
    w,
    account: planner?.account ?? "",
    session,
    cook,
    calls,
    changed,
    run: async (more = {}) => {
      const made = await w.runs.create({
        id: `run${String(++n).padStart(5, "0")}`,
        household: cookRow?.household ?? "",
        audience: cook.member,
        workflow: "test_ping",
        about: { day: "Tuesday" },
        dueAt: T0,
        expiresAt: new Date(Date.parse(T0) + 86_400_000).toISOString(),
        now: T0,
        ...more,
      });
      return made.id;
    },
    press: (value, chat = cook.chat) =>
      send({ kind: "button", value, answers: null }, chat),
    say: (event, chat = cook.chat) => send(event, chat),
    tick: async () => {
      await tick(h.deps);
      await h.settle();
    },
    said: () => {
      const texts = h.channel.deliveries.map((d) =>
        "text" in d.message ? d.message.text : d.message.kind,
      );
      h.channel.deliveries.length = 0;
      return texts;
    },
  };
}

/** The button a run's message carries, as the engine makes it. */
export const button = buttonValue;
