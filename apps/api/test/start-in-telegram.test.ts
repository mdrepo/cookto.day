import { describe, expect, test } from "bun:test";
import { createHousehold } from "../src/household/routes.js";
import { push } from "../src/household/sync.js";
import { CHANGE } from "../src/household/tomorrow-plan.js";
import { webhook } from "../src/messenger/webhook.js";
import { WORDS } from "../src/messenger/words.js";
import { as, home, joined, MAYUR, signedInAs } from "./household-flow.js";
import { record } from "./household-support.js";
import { incoming } from "./messenger-flow.js";
import { harness, type Harness } from "./messenger-support.js";
import { withWorkflows } from "./tomorrow-support.js";

// specs/260, criteria 1, 3 and 4: Start with no code answers with the page
// that sets up the kitchen, or opens it again; the cook hears she's
// connected; and a household started by a planner on Telegram gets the
// bot's "set up", once.

const WELCOME =
  "Hello! I help your family plan its meals, and send them to your cook. Setting up takes a minute.";
const SET_UP =
  "Your kitchen is set up. Each night at 10 I'll send you tomorrow's plan to check.";

let updates = 0;

/** Start pressed in the bot from `chat`, with `code` (none by default). */
async function start(
  h: Harness,
  chat: string,
  from?: { id: string; name: string },
  code = "",
) {
  const u = h.channel.update({
    id: `u-start-${String(++updates)}`,
    chat,
    event: { kind: "started", code },
    ...(from && { from }),
  });
  await webhook(incoming(u), h.deps);
  await h.settle();
}

const to = (h: Harness, chat: string) =>
  h.channel.deliveries
    .filter((d) => d.chat === chat)
    .map((d) => ({
      text: "text" in d.message ? d.message.text : d.message.kind,
      buttons: d.message.kind === "buttons" ? d.message.buttons.flat() : [],
    }));

describe("1. start with no code", () => {
  test("someone the API has never seen gets one button that opens the setup page", async () => {
    const h = harness();
    await start(h, "99", { id: "99", name: "Asha" });
    expect(to(h, "99")).toEqual([
      {
        text: WELCOME,
        buttons: [{ label: "Set up your kitchen", app: CHANGE }],
      },
    ]);
    expect(h.auth.accounts.size).toBe(0);
    expect(h.households.rows.size).toBe(0);
  });
});

describe("3. start again", () => {
  test('a planner with a household: "You\'re set up." with "Open cookto.day"; a bad code still says so', async () => {
    const h = harness();
    await home(h);
    await start(h, "42", MAYUR);
    expect(to(h, "42")).toEqual([
      {
        text: "You're set up.",
        buttons: [{ label: "Open cookto.day", app: CHANGE }],
      },
    ]);
    await start(h, "42", MAYUR, "ZZZZ2222");
    expect(to(h, "42").at(-1)?.text).toBe(WORDS.badCode);
  });

  test("the household's cook gets the connected text again", async () => {
    const h = harness();
    const { session } = await home(h);
    await joined(h, session, "cook", "c-cook", { id: "55", name: "Sunita" });
    h.channel.deliveries.length = 0;
    await start(h, "c-cook", { id: "55", name: "Sunita" });
    expect(to(h, "c-cook").map((s) => s.text)).toEqual([WORDS.connected]);
  });
});

describe("4. the bot says it's set up", () => {
  test("a household started by a planner on Telegram: the bot says so, once", async () => {
    const h = harness();
    // A private chat's id on Telegram is its person's id.
    const session = await signedInAs(h, MAYUR, MAYUR.id);
    withWorkflows(h);
    const made = await createHousehold(
      as(session, "POST", "/api/household", {
        records: [record("members", "m-1", { kind: "adult" })],
      }),
      h.deps,
    );
    expect(made.status).toBe(201);
    await h.settle();
    expect(to(h, MAYUR.id).map((s) => s.text)).toEqual([SET_UP]);

    await push(
      as(session, "POST", "/api/sync/push", {
        records: [record("members", "m-1", { kind: "adult" }, 2)],
      }),
      h.deps,
    );
    await h.settle();
    expect(to(h, MAYUR.id).map((s) => s.text)).toEqual([SET_UP]);
  });
});
