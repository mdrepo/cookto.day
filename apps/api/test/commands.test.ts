import { describe, expect, test } from "bun:test";
import type { Event } from "@cookto/messenger";
import { webhook } from "../src/messenger/webhook.js";
import { record } from "./household-support.js";
import { incoming } from "./messenger-flow.js";
import {
  COOK_CHAT,
  evening,
  PLANNER_CHAT,
  planRecord,
  TOMORROW,
} from "./tomorrow-support.js";

// specs/270-the-bot-talks-like-a-person.md, criteria 10, 11 and 13 to 15:
// the commands answer in the chat. Each chat's menu has its role's
// commands; /tomorrow asks now or says how it went; /off, /today, /list and
// /ranout; a stranger, an unknown command and the switch. Mayur and Priya
// eat lunch and dinner; tomorrow is Thursday 22 October. The fake
// messenger, runs in memory and a fixed clock (ADR 0034).

const SUNITA = { id: "77", name: "Sunita" };
const texts = (s: { text: string }[]) => s.map((x) => x.text);
const labels = (s: { buttons: { label: string }[] } | undefined) =>
  (s?.buttons ?? []).map((b) => b.label);
const command = (name: string) => ({ kind: "command", name }) as Event;
const KITCHEN = {
  kitchen: {
    cuisines: ["north-indian", "our-kitchen"],
    skip: [],
    sample: null,
  },
};

describe("10. the command menus", () => {
  test("the planner's chat and the cook's each get their role's commands", async () => {
    const e = await evening({ cook: SUNITA });
    const menu = (chat: string) =>
      (e.h.channel.menus.get(chat) ?? []).map((c) => c.command);
    expect(menu(PLANNER_CHAT)).toEqual(["tomorrow", "today", "off", "list"]);
    expect(menu(COOK_CHAT)).toEqual(["tomorrow", "today", "ranout"]);
  });

  test("planners who cook have /ranout too", async () => {
    const e = await evening({ cook: false });
    expect(
      (e.h.channel.menus.get(PLANNER_CHAT) ?? []).map((c) => c.command),
    ).toEqual(["tomorrow", "today", "off", "list", "ranout"]);
  });
});

describe("11. /tomorrow", () => {
  test("not sorted yet: the 10 pm question now, and not again at 10 pm", async () => {
    const e = await evening({ cook: SUNITA });
    e.at("18:00");
    await e.say(PLANNER_CHAT, command("tomorrow"));
    const ask = e.to(PLANNER_CHAT);
    expect(texts(ask)).toEqual([
      "Hi Mayur, here's tomorrow, Thursday.",
      "Lunch for 2: Dal tadka.",
      "Dinner for 2: Palak paneer.",
      "Shall I send it to Sunita?",
    ]);
    expect(labels(ask.at(-1))).toEqual(["Send it", "Change", "No cooking"]);
    e.at("22:00");
    await e.tick();
    expect(e.to(PLANNER_CHAT)).toEqual([]);
  });

  test("sent and seen: the plan, when it went, and that she saw it", async () => {
    const e = await evening({ cook: SUNITA });
    e.at("22:00");
    await e.tick();
    e.at("22:04");
    await e.press(PLANNER_CHAT, "Send it");
    await e.press(COOK_CHAT, "Got it");
    e.to(PLANNER_CHAT);
    e.at("22:30");
    await e.say(PLANNER_CHAT, command("tomorrow"));
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Hi Mayur, here's tomorrow, Thursday.",
      "Lunch for 2: Dal tadka.",
      "Dinner for 2: Palak paneer.",
      "Sent to Sunita at 10:04 pm.",
      "She's seen it ✓",
    ]);
  });

  test("nothing planned: says so, with the app", async () => {
    const e = await evening({ cook: SUNITA, plans: false });
    e.at("18:00");
    await e.say(PLANNER_CHAT, command("tomorrow"));
    const said = e.to(PLANNER_CHAT);
    expect(texts(said)).toEqual(["Tomorrow isn't planned yet."]);
    expect(labels(said.at(-1))).toEqual(["Open the app"]);
  });
});

describe("13. /off", () => {
  test("the day after: a day off, the cook told, and the planner hears it", async () => {
    const e = await evening({ cook: SUNITA });
    e.at("18:00");
    await e.say(PLANNER_CHAT, command("off"));
    const ask = e.to(PLANNER_CHAT);
    expect(texts(ask)).toEqual(["Which day is Sunita off?"]);
    expect(labels(ask.at(-1))).toEqual(["Tomorrow", "Day after"]);
    await e.press(PLANNER_CHAT, "Day after");
    expect(e.server("household-settings", "household")).toMatchObject({
      daysOff: { weekdays: [], dates: ["2026-10-23"] },
    });
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "No cooking on Friday.",
      "Enjoy the day off.",
    ]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Got it.",
      "Sunita is off on Friday.",
      "I've told her.",
    ]);
  });
});

describe("14. /today, /list and /ranout", () => {
  test("/today: each meal, made, not made, or not yet", async () => {
    const e = await evening({
      cook: SUNITA,
      members: [
        record("members", "m-1", {
          kind: "adult",
          meals: ["breakfast", "lunch", "dinner"],
        }),
        record("members", "m-2", { kind: "adult", meals: ["lunch", "dinner"] }),
      ],
      plans: [
        planRecord("breakfast", "aloo-paratha"),
        record("plans", `plan:${TOMORROW}:lunch`, {
          on: TOMORROW,
          slot: "lunch",
          dish: "dal-tadka",
          prep: null,
          made: "no",
        }),
        planRecord("dinner", "palak-paneer"),
      ],
      records: [
        record("cooked", "c-1", { dish: "aloo-paratha", on: TOMORROW }),
      ],
    });
    e.at("15:00", TOMORROW);
    await e.say(PLANNER_CHAT, command("today"));
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Here's today, Thursday.",
      "Breakfast for 1: Aloo paratha. Made ✓",
      "Lunch for 2: Dal tadka. Not made",
      "Dinner for 2: Palak paneer. Not yet",
    ]);
  });

  test("/list: what to buy, in one message, with the list", async () => {
    const e = await evening({
      cook: SUNITA,
      settings: KITCHEN,
      records: [
        record("shopping", "s-1", {
          ingredient: "Q8495",
          addedAt: "2026-10-21T10:00:00.000Z",
          place: 0,
        }),
        record("shopping", "s-2", {
          ingredient: "Q651829",
          addedAt: "2026-10-21T10:00:00.000Z",
          place: 1,
        }),
      ],
    });
    e.at("18:00");
    await e.say(PLANNER_CHAT, command("list"));
    const said = e.to(PLANNER_CHAT);
    expect(texts(said)).toEqual(["To buy: milk, besan."]);
    expect(labels(said.at(-1))).toEqual(["Open the list"]);
  });

  test("/ranout from the cook: on the list, and the planner hears it", async () => {
    const e = await evening({ cook: SUNITA, settings: KITCHEN });
    e.at("18:00");
    await e.say(COOK_CHAT, command("ranout"));
    expect(texts(e.to(COOK_CHAT))).toEqual(["What ran out?", "Send its name."]);
    await e.say(COOK_CHAT, { kind: "text", text: "milk" });
    expect(
      e.h.households.records
        .filter((r) => r.collection === "shopping")
        .map((r) => r.record.ingredient),
    ).toEqual(["Q8495"]);
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "Added milk to the shopping list.",
    ]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Sunita says milk ran out.",
      "It's on the list.",
    ]);
  });
});

describe("15. strangers, unknown commands and the switch", () => {
  test("someone with no household is asked to set up their kitchen", async () => {
    const e = await evening({ cook: SUNITA });
    const u = e.h.channel.update({
      id: "u-stranger",
      chat: "c-stranger",
      event: command("today"),
      from: { id: "99", name: "Asha" },
    });
    await webhook(incoming(u), e.h.deps);
    await e.h.settle();
    const said = e.to("c-stranger");
    expect(labels(said.at(-1))).toEqual(["Set up your kitchen"]);
  });

  test("an unknown command says what to do", async () => {
    const e = await evening({ cook: SUNITA });
    await e.say(PLANNER_CHAT, command("hello"));
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "I don't know that one.",
      "Type / to see what I can do.",
    ]);
  });

  test("the household's bot off: switched off, and nothing to the cook", async () => {
    const e = await evening({ cook: SUNITA });
    await e.botOff();
    e.at("18:00");
    await e.say(PLANNER_CHAT, command("tomorrow"));
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["I'm switched off for now."]);
    expect(e.to(COOK_CHAT)).toEqual([]);
  });
});
