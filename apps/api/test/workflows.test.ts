import { describe, expect, test } from "bun:test";
import { linked } from "./messenger-flow.js";
import { button, engine } from "./workflow-support.js";

// specs/234, criteria 5 to 10, through the webhook and the cron as they
// run (ADR 0034): a press claims its run, acts, and commits; one that loses
// changes nothing and hears "That's done already"; the router's order; due
// runs and the floor; expiry; and the two switches.

const DONE = "That's done already.";
const CANT = "I can't read replies yet. Tomorrow's plan comes from the app.";
const later = (minutes: number) =>
  new Date(Date.parse("2026-10-21T15:00:00.000Z") + minutes * 60_000);

describe("claim, act, commit", () => {
  test("two presses at once: one moves the run, the other is told it's done", async () => {
    const e = await engine();
    const id = await e.run();
    await e.tick();
    expect(e.said()).toEqual(["Ping for Tuesday?"]);
    const yes = button(id, "ask", "yes");
    await Promise.all([e.press(yes), e.press(yes)]);
    expect(e.calls.filter((c) => c.name === "passOn")).toHaveLength(1);
    expect(e.said()).toEqual([DONE]);
    expect(await e.w.runs.get(id)).toMatchObject({
      step: "note",
      status: "waiting",
      floor: true,
    });
  });

  test("a claim whose lease runs out is claimed again; its action changes nothing twice", async () => {
    const e = await engine();
    const id = await e.run();
    await e.tick();
    e.said();
    const passOn = e.w.actions.passOn;
    let crash = true;
    e.w.actions.passOn = async (a) => {
      await passOn?.(a);
      if (crash) {
        crash = false;
        throw new Error("crash");
      }
    };
    await e.press(button(id, "ask", "yes")).catch(() => undefined);
    expect((await e.w.runs.get(id))?.step).toBe("ask");
    e.h.clock.now = later(1).getTime();
    await e.press(button(id, "ask", "yes"));
    expect(e.calls.filter((c) => c.name === "passOn")).toHaveLength(2);
    expect([...e.changed]).toEqual([`passOn:${id}:ask`]);
    expect((await e.w.runs.get(id))?.step).toBe("note");
  });
});

describe("stale and forged buttons", () => {
  test("the wrong step, no such run, someone else's chat, a done run, not a run's: nothing changes", async () => {
    const e = await engine();
    await linked(e.h);
    const id = await e.run();
    await e.tick();
    e.said();
    await e.press(button(id, "note", "yes"));
    await e.press(button("rnothere", "ask", "yes"));
    await e.press(button(id, "ask", "yes"), "chat-1");
    expect(e.said()).toEqual([DONE, DONE, DONE]);
    await e.press(button(id, "ask", "no"));
    await e.press(button(id, "ask", "yes"));
    expect(e.said()).toEqual([DONE]);
    await e.press("plan:looks-good");
    expect(e.said()).toEqual([CANT]);
    expect(e.calls).toEqual([]);
    expect((await e.w.runs.get(id))?.status).toBe("done");
  });
});

describe("the router's order", () => {
  test("a command beside the open step; a button to its run; a photo it doesn't take, to the planner; text to the step", async () => {
    const e = await engine();
    const first = await e.run();
    const second = await e.run();
    await e.tick();
    await e.press(button(first, "ask", "yes"));
    e.said();

    await e.say({ kind: "text", text: "/help" });
    expect(e.said()).toEqual([CANT]);
    expect((await e.w.runs.get(first))?.step).toBe("note");

    await e.press(button(second, "ask", "no"));
    expect((await e.w.runs.get(second))?.status).toBe("done");
    expect((await e.w.runs.get(first))?.step).toBe("note");

    await e.say({ kind: "photo", ref: "f-1", caption: null });
    expect(e.said()).toEqual([CANT]);
    expect((await e.w.runs.get(first))?.step).toBe("note");

    await e.say({ kind: "text", text: "hello" });
    expect(e.said()).toEqual([]);
    expect((await e.w.runs.get(first))?.status).toBe("done");
    expect(e.calls.map((c) => c.name)).toEqual(["passOn"]);
  });
});

describe("due runs, and the floor", () => {
  test("a due run waits while its person answers another; the next cron starts it", async () => {
    const e = await engine();
    const first = await e.run();
    await e.tick();
    await e.press(button(first, "ask", "yes"));
    const second = await e.run();
    e.said();
    await e.tick();
    expect((await e.w.runs.get(second))?.status).toBe("due");
    expect(e.said()).toEqual([]);
    await e.say({ kind: "text", text: "noted" });
    await e.tick();
    expect(e.said()).toEqual(["Ping for Tuesday?"]);
    expect((await e.w.runs.get(second))?.status).toBe("waiting");
  });
});

describe("expiry", () => {
  test("an expired run's action runs once, and it's marked expired", async () => {
    const e = await engine();
    const id = await e.run({ expiresAt: later(10).toISOString() });
    await e.tick();
    e.h.clock.now = later(10).getTime();
    await e.tick();
    await e.tick();
    expect(e.calls.map((c) => [c.name, c.input.kind])).toEqual([
      ["countsAsDone", "expire"],
    ]);
    expect((await e.w.runs.get(id))?.status).toBe("expired");
  });
});

describe("the switches", () => {
  test("off for everyone: nothing starts, presses do nothing, /stop still works; back on, it carries on", async () => {
    const e = await engine();
    const id = await e.run();
    e.w.off = true;
    await e.tick();
    expect(e.said()).toEqual([]);
    expect((await e.w.runs.get(id))?.status).toBe("due");
    e.w.off = false;
    await e.tick();
    expect(e.said()).toEqual(["Ping for Tuesday?"]);
    e.w.off = true;
    await e.press(button(id, "ask", "yes"));
    expect(e.said()).toEqual([]);
    expect((await e.w.runs.get(id))?.step).toBe("ask");
    await e.say({ kind: "stopped" });
    expect(e.said()).toEqual([
      "Stopped and deleted. Nothing more will come from me.",
    ]);
  });

  test("off for one household: its runs wait; back on, they start", async () => {
    const e = await engine();
    const id = await e.run();
    await e.w.runs.setBotOff(e.account, true);
    await e.tick();
    expect(e.said()).toEqual([]);
    expect((await e.w.runs.get(id))?.status).toBe("due");
    await e.w.runs.setBotOff(e.account, false);
    await e.tick();
    expect(e.said()).toEqual(["Ping for Tuesday?"]);
  });
});
