import { describe, expect, test } from "bun:test";
import {
  createChanges,
  createCooked,
  createPantry,
  memoryRecordStore,
} from "@cookto/data";
import { pull } from "../src/household/sync.js";
import { as } from "./household-flow.js";
import { live, ONION, RICE, theDay, TODAY, TOOR } from "./checks-support.js";
import { COOK_CHAT, PLANNER_CHAT } from "./tomorrow-support.js";

// specs/242-meal-checks.md, criteria 1 to 8: an hour after each meal the
// cook is asked; Yes counts it cooked and takes the recipe's amounts from
// the pantry; No asks why and tells the planner; "Ran out of something"
// asks what and puts it on the list; the day's unanswered meals come
// together an hour after the last check; silence after that changes
// nothing; no checks on a day off or a day the plan didn't go. The fake
// messenger, runs in memory and a fixed clock (ADR 0034).

const labels = (b: { label: string }[]) => b.map((x) => x.label);
const texts = (s: { text: string }[]) => s.map((x) => x.text);

describe("1. an hour after the meal", () => {
  test("nothing at 13:59; lunch's check at 14:00 with its dishes; nothing more at 14:01", async () => {
    const e = await theDay();
    e.at("13:59");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
    e.at("14:00");
    await e.tick();
    // One sentence a message (specs/270): the buttons on the last.
    const ask = e.to(COOK_CHAT);
    expect(texts(ask)).toEqual(["Did you make lunch?", "Dal tadka"]);
    expect(labels(ask.at(-1)?.buttons ?? [])).toEqual(["Yes", "No"]);
    e.at("14:01");
    await e.tick();
    expect(e.to(COOK_CHAT)).toEqual([]);
  });
});

describe("2. yes", () => {
  test("cooked today; 160 g toor dal taken, the onion used up, the rice left; Thanks", async () => {
    const e = await theDay();
    e.at("14:00");
    await e.tick();
    e.to(COOK_CHAT);
    await e.press(COOK_CHAT, "Yes");
    expect(live(e, "cooked")).toMatchObject([{ dish: "dal-tadka", on: TODAY }]);
    const pantry = live(e, "pantry");
    expect(pantry.find((p) => p.ingredient === TOOR)).toMatchObject({
      amount: 340,
      unit: "g",
    });
    expect(pantry.find((p) => p.ingredient === ONION)).toBeUndefined();
    expect(pantry.find((p) => p.ingredient === RICE)).toMatchObject({
      ingredient: RICE,
    });
    expect(pantry.find((p) => p.ingredient === RICE)?.amount).toBeUndefined();
    expect(texts(e.to(COOK_CHAT))).toEqual(["Thanks."]);
  });
});

describe("3. no, and why", () => {
  test("Didn't cook it: nothing cooked or taken; the planner hears why", async () => {
    const e = await theDay();
    e.at("14:00");
    await e.tick();
    e.to(COOK_CHAT);
    await e.press(COOK_CHAT, "No");
    const [why] = e.to(COOK_CHAT);
    expect(why?.text).toBe("What happened?");
    expect(labels(why?.buttons ?? [])).toEqual([
      "Made other food",
      "Didn't cook it",
      "Ran out of something",
    ]);
    await e.press(COOK_CHAT, "Didn't cook it");
    expect(live(e, "cooked")).toEqual([]);
    expect(live(e, "pantry").find((p) => p.ingredient === TOOR)?.amount).toBe(
      500,
    );
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Lunch wasn't made: didn't cook it.",
    ]);
  });
});

describe("4. ran out", () => {
  test("milk goes on the list; the planner hears what she wrote", async () => {
    const e = await theDay();
    e.at("14:00");
    await e.tick();
    await e.press(COOK_CHAT, "No");
    await e.press(COOK_CHAT, "Ran out of something");
    expect(texts(e.to(COOK_CHAT)).slice(-2)).toEqual([
      "What ran out?",
      "Send its name.",
    ]);
    await e.say(COOK_CHAT, { kind: "text", text: "milk and kasuri methi" });
    expect(live(e, "shopping").map((s) => s.ingredient)).toEqual(["Q8495"]);
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "Added milk to the shopping list.",
    ]);
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Lunch wasn't made: ran out of milk and kasuri methi.",
    ]);
  });
});

describe("5. the end of the day", () => {
  test("the unanswered meals together at 22:00; Some of them, then each in turn", async () => {
    const e = await theDay({
      settings: {
        mealTimes: {
          breakfast: "08:00",
          "morning-snack": "11:00",
          lunch: "13:00",
          "evening-snack": "17:00",
          dinner: "20:00",
        },
      },
    });
    for (const t of ["14:00", "21:00"]) {
      e.at(t);
      await e.tick();
    }
    // Dinner was answered; lunch wasn't.
    await e.press(COOK_CHAT, "Yes");
    e.to(COOK_CHAT);
    e.at("22:00");
    await e.tick();
    const [end] = e.to(COOK_CHAT);
    expect(end?.text).toBe("Not answered today: lunch.");
    expect(labels(end?.buttons ?? [])).toEqual([
      "Made them all",
      "Some of them",
      "None of them",
    ]);
    await e.press(COOK_CHAT, "Some of them");
    expect(texts(e.to(COOK_CHAT))).toEqual([
      "Did you make lunch?",
      "Dal tadka",
    ]);
    await e.press(COOK_CHAT, "No");
    expect(texts(e.to(PLANNER_CHAT))).toEqual([
      "Lunch wasn't made: didn't say.",
    ]);
  });

  test("the single checks' buttons are done once the day's message comes", async () => {
    const e = await theDay();
    e.at("14:00");
    await e.tick();
    const lunchCheck = e.h.channel.deliveries.find(
      (d) => d.chat === COOK_CHAT && d.message.kind === "buttons",
    );
    e.at("22:00");
    await e.tick();
    e.to(COOK_CHAT);
    const yes =
      lunchCheck?.message.kind === "buttons"
        ? lunchCheck.message.buttons.flat().find((b) => b.label === "Yes")
        : undefined;
    await e.say(COOK_CHAT, {
      kind: "button",
      value: yes && "value" in yes ? yes.value : "",
      answers: null,
    });
    expect(texts(e.to(COOK_CHAT))).toEqual(["That's done already."]);
    expect(live(e, "cooked")).toEqual([]);
  });

  test("Made them all: each counted cooked, its amounts taken", async () => {
    const e = await theDay();
    for (const t of ["14:00", "21:00", "22:00"]) {
      e.at(t);
      await e.tick();
    }
    e.to(COOK_CHAT);
    await e.press(COOK_CHAT, "Made them all");
    expect(
      live(e, "cooked")
        .map((c) => c.dish)
        .sort(),
    ).toEqual(["dal-tadka", "palak-paneer"]);
  });
});

describe("6. silence", () => {
  test("the day's message unanswered at 6:00: nothing cooked, taken or told", async () => {
    const e = await theDay();
    for (const t of ["14:00", "21:00", "22:00"]) {
      e.at(t);
      await e.tick();
    }
    expect(texts(e.to(COOK_CHAT)).at(-1)).toBe(
      "Not answered today: lunch, dinner.",
    );
    e.to(PLANNER_CHAT);
    e.at("06:00", "2026-10-22");
    await e.tick();
    expect(live(e, "cooked")).toEqual([]);
    expect(live(e, "pantry").find((p) => p.ingredient === TOOR)?.amount).toBe(
      500,
    );
    expect(e.to(COOK_CHAT)).toEqual([]);
    expect(e.to(PLANNER_CHAT)).toEqual([]);
  });
});

describe("7. days off and unsent plans", () => {
  /** What reaches the cook through the day, from 14:00 to 22:00. */
  const allDay = async (e: Awaited<ReturnType<typeof theDay>>) => {
    for (const t of ["14:00", "21:00", "22:00"]) {
      e.at(t);
      await e.tick();
    }
    return texts(e.to(COOK_CHAT));
  };

  test("a day off: no check all day, where a working day has them", async () => {
    expect(await allDay(await theDay())).toContain(
      "Did you make lunch?\nDal tadka",
    );
    const off = await theDay({
      settings: { daysOff: { weekdays: [], dates: [TODAY] } },
    });
    expect(await allDay(off)).toEqual([]);
  });

  test("today's plan never went to her: no check all day", async () => {
    expect(await allDay(await theDay())).toContain(
      "Did you make dinner?\nPalak paneer",
    );
    expect(await allDay(await theDay({ sent: false }))).toEqual([]);
  });

  test("the bot off: no check", async () => {
    expect((await allDay(await theDay())).length).toBeGreaterThan(0);
    const e = await theDay();
    await e.botOff();
    expect(await allDay(e)).toEqual([]);
  });
});

describe("8. the planner's phone sees it", () => {
  test("after a pull, lunch is cooked and the kitchen has the new amounts", async () => {
    const e = await theDay();
    e.at("14:00");
    await e.tick();
    await e.press(COOK_CHAT, "Yes");
    const page = (await (
      await pull(as(e.session, "GET", "/api/sync/changes?after=0"), e.h.deps)
    ).json()) as { changes: { collection: string; record: { id: string } }[] };
    const phone = memoryRecordStore();
    for (const c of page.changes) await phone.put(c.collection, [c.record]);
    const changes = createChanges();
    const cooked = await createCooked(phone, { changes }).reader.all();
    expect(cooked).toMatchObject([{ dish: "dal-tadka", on: TODAY }]);
    const items = await createPantry(phone, { changes }).reader.items();
    expect(items.find((i) => i.ingredient === TOOR)?.amount).toBe(340);
    expect(items.find((i) => i.ingredient === ONION)).toBeUndefined();
  });
});
