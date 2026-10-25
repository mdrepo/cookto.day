import { beforeEach, describe, expect, test } from "bun:test";
import type { NewRun, Runs } from "../src/runs.js";

// specs/234, criterion 12: what a run store promises (ADR 0034), the same in
// memory and on Postgres. A run is made due, claimed once, committed once
// with its messages queued together, found when due unless its household is
// off or its person holds the floor, expired, and gone with its household.

export interface RunsSetUp {
  runs: Runs;
  household: string;
  planner: { member: string; account: string; conversation: string };
  cook: { member: string; conversation: string };
  /** Messages in the outbox, everywhere. */
  queued: () => Promise<number>;
  dropHousehold: () => Promise<void>;
}

const T0 = "2026-10-21T15:00:00.000Z";
const at = (minutes: number) =>
  new Date(Date.parse(T0) + minutes * 60_000).toISOString();

export function runsContract(name: string, setUp: () => Promise<RunsSetUp>) {
  describe(`runs: ${name}`, () => {
    let s: RunsSetUp;
    let n = 0;
    const run = (more: Partial<NewRun> = {}): NewRun => ({
      id: `r${String(++n).padStart(7, "0")}`,
      household: s.household,
      audience: s.cook.member,
      workflow: "test_ping",
      about: { day: "2026-10-22" },
      dueAt: T0,
      expiresAt: at(60 * 24),
      now: T0,
      ...more,
    });
    const text = (conversation: string, words: string) => ({
      conversation,
      message: { kind: "text" as const, text: words },
      context: null,
    });

    beforeEach(async () => {
      s = await setUp();
    });

    test("made due, at revision 0, with no step", async () => {
      const made = await s.runs.create(run());
      expect(made).toMatchObject({
        status: "due",
        step: null,
        rev: 0,
        lease: null,
        floor: false,
        about: { day: "2026-10-22" },
      });
      expect(await s.runs.get(made.id)).toMatchObject({
        id: made.id,
        botOff: false,
      });
      expect(await s.runs.get("rnothere")).toBeNull();
    });

    test("claimed once; again only after the lease runs out", async () => {
      const made = await s.runs.create(run());
      const first = await s.runs.claim(made.id, null, 0, T0, at(1));
      const second = await s.runs.claim(made.id, null, 0, T0, at(1));
      expect(first?.rev).toBe(1);
      expect(second).toBeNull();
      expect(await s.runs.claim(made.id, null, 1, at(0.5), at(1.5))).toBeNull();
      expect((await s.runs.claim(made.id, null, 1, at(2), at(3)))?.rev).toBe(2);
      expect(await s.runs.claim(made.id, "ask", 2, at(4), at(5))).toBeNull();
    });

    test("committed once, its messages queued with it", async () => {
      const made = await s.runs.create(run());
      const claimed = await s.runs.claim(made.id, null, 0, T0, at(1));
      const next = { step: "ask", status: "waiting" as const, floor: false };
      const before = await s.queued();
      const done = await s.runs.commit(
        made.id,
        claimed?.rev ?? -1,
        next,
        [text(s.cook.conversation, "Ping?")],
        T0,
      );
      expect(done.ok).toBe(true);
      expect(done.ids).toHaveLength(1);
      expect(await s.queued()).toBe(before + 1);
      expect(await s.runs.get(made.id)).toMatchObject({
        step: "ask",
        status: "waiting",
        rev: 2,
        lease: null,
        messages: done.ids,
      });
      const again = await s.runs.commit(
        made.id,
        claimed?.rev ?? -1,
        next,
        [text(s.cook.conversation, "Ping?")],
        T0,
      );
      expect(again).toEqual({ ok: false, ids: [] });
      expect(await s.queued()).toBe(before + 1);
    });

    test("due by time, unless the household is off or the person holds the floor", async () => {
      const now = await s.runs.create(run());
      await s.runs.create(run({ dueAt: at(30) }));
      expect((await s.runs.due(T0)).map((r) => r.id)).toEqual([now.id]);

      await s.runs.setBotOff(s.planner.account, true);
      expect(await s.runs.due(T0)).toEqual([]);
      expect((await s.runs.get(now.id))?.botOff).toBe(true);
      await s.runs.setBotOff(s.planner.account, false);

      const holding = await s.runs.create(run());
      const c = await s.runs.claim(holding.id, null, 0, T0, at(1));
      await s.runs.commit(
        holding.id,
        c?.rev ?? -1,
        { step: "note", status: "waiting", floor: true },
        [],
        T0,
      );
      expect(await s.runs.due(T0)).toEqual([]);
      const planners = await s.runs.create(run({ audience: "planners" }));
      expect((await s.runs.due(T0)).map((r) => r.id)).toEqual([planners.id]);
    });

    test("open runs of a member, and the conversations a run speaks to", async () => {
      const mine = await s.runs.create(run());
      const theirs = await s.runs.create(run({ audience: "planners" }));
      for (const r of [mine, theirs]) {
        const c = await s.runs.claim(r.id, null, 0, T0, at(1));
        await s.runs.commit(
          r.id,
          c?.rev ?? -1,
          { step: "ask", status: "waiting", floor: false },
          [],
          T0,
        );
      }
      expect((await s.runs.open(s.cook.member)).map((r) => r.id)).toEqual([
        mine.id,
      ]);
      expect((await s.runs.open(s.planner.member)).map((r) => r.id)).toEqual([
        theirs.id,
      ]);
      expect(await s.runs.conversations(mine.id)).toEqual([
        s.cook.conversation,
      ]);
      expect(await s.runs.conversations(theirs.id)).toEqual([
        s.planner.conversation,
      ]);
    });

    test("a run for the cooks speaks to every cook, not the planners (specs/241)", async () => {
      const toCooks = await s.runs.create(run({ audience: "cooks" }));
      expect(await s.runs.conversations(toCooks.id)).toEqual([
        s.cook.conversation,
      ]);
    });

    test("expired when waiting past its time; gone with its household", async () => {
      const soon = await s.runs.create(run({ expiresAt: at(10) }));
      const c = await s.runs.claim(soon.id, null, 0, T0, at(1));
      await s.runs.commit(
        soon.id,
        c?.rev ?? -1,
        { step: "ask", status: "waiting", floor: false },
        [],
        T0,
      );
      expect(await s.runs.expired(at(5))).toEqual([]);
      expect((await s.runs.expired(at(10))).map((r) => r.id)).toEqual([
        soon.id,
      ]);
      await s.dropHousehold();
      expect(await s.runs.get(soon.id)).toBeNull();
    });
  });
}
