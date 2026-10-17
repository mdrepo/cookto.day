import { describe, expect, test } from "bun:test";
import { addressKey } from "../src/usage/address.js";
import { LIMITS } from "../src/usage/limits.js";
import { ledger } from "./support.js";

// specs/129-receipt-photos.md, rules 4 and 5: every read is counted before
// the AI is called, against four limits, all at once or not at all.

const home = (household: string, address = "addr-1") => ({
  household,
  address,
});

describe("the limits on receipt photos", () => {
  test("a household's fourth read today is refused until midnight UTC", () => {
    const { counts } = ledger();
    const morning = new Date("2026-10-16T09:00:00Z");
    for (let i = 0; i < 3; i++)
      expect(counts.take(home("home-1"), morning).ok).toBe(true);
    expect(
      counts.take(home("home-1"), new Date("2026-10-16T23:59:59Z")),
    ).toEqual({
      ok: false,
      limit: "household-day",
      resetsAt: "2026-10-17T00:00:00Z",
    });
    expect(counts.take(home("home-2"), morning).ok).toBe(true);
    expect(
      counts.take(home("home-1"), new Date("2026-10-17T00:00:00Z")).ok,
    ).toBe(true);
  });

  test("a household's 31st read this month is refused until the 1st", () => {
    const { counts } = ledger();
    for (let day = 1; day <= 10; day++)
      for (let i = 0; i < 3; i++) {
        const on = new Date(
          `2026-10-${String(day).padStart(2, "0")}T08:00:00Z`,
        );
        expect(counts.take(home("home-1", `addr-${day}`), on).ok).toBe(true);
      }
    expect(
      counts.take(home("home-1", "addr-11"), new Date("2026-10-11T08:00:00Z")),
    ).toEqual({
      ok: false,
      limit: "household-month",
      resetsAt: "2026-11-01T00:00:00Z",
    });
  });

  test("one address can't read more than 20 a day, whatever the household", () => {
    const { counts } = ledger();
    const now = new Date("2026-10-16T09:00:00Z");
    for (let i = 0; i < 20; i++)
      expect(counts.take(home(`home-${i}`, "addr-1"), now).ok).toBe(true);
    const refused = counts.take(home("home-99", "addr-1"), now);
    expect(refused.ok ? null : refused.limit).toBe("address-day");
  });

  test("everyone together can't read more than 2,000 a day", () => {
    const { counts } = ledger();
    const now = new Date("2026-10-16T09:00:00Z");
    for (let i = 0; i < 2000; i++)
      counts.take(home(`home-${i}`, `addr-${i}`), now);
    const refused = counts.take(home("home-x", "addr-x"), now);
    expect(refused.ok ? null : refused.limit).toBe("everyone-day");
  });

  test("a refused read counts nothing, and a read given back no longer counts", () => {
    const { counts, counted } = ledger();
    const now = new Date("2026-10-16T09:00:00Z");
    const taken = [1, 2, 3].map(() => counts.take(home("home-1"), now));
    expect(counted()).toBe(3 * LIMITS.length);
    expect(counts.take(home("home-1"), now).ok).toBe(false);
    expect(counted()).toBe(3 * LIMITS.length);

    const first = taken[0];
    if (!first?.ok) throw new Error("the first read was refused");
    counts.giveBack(first.ticket);
    counts.giveBack(first.ticket);
    expect(counted()).toBe(2 * LIMITS.length);
    expect(counts.take(home("home-1"), now).ok).toBe(true);
  });

  test("a strike ends only that household's day, and its read stays counted", () => {
    // specs/129-receipt-photos.md, rule 8.
    const { counts, db } = ledger();
    const now = new Date("2026-10-16T09:00:00Z");
    const read = counts.take(home("home-1"), now);
    if (!read.ok) throw new Error("the read was refused");
    counts.strike(read.ticket);
    counts.strike(read.ticket);
    counts.giveBack(read.ticket);

    expect(counts.take(home("home-1", "addr-2"), now)).toEqual({
      ok: false,
      limit: "household-day",
      resetsAt: "2026-10-17T00:00:00Z",
    });
    expect(counts.take(home("home-2"), now).ok).toBe(true);
    const count = (key: string) =>
      (db.query("SELECT n FROM counts WHERE key = ?").get(key) as { n: number })
        .n;
    expect(count("household-month|home-1|2026-10")).toBe(1);
    expect(count("address-day|addr-1|2026-10-16")).toBe(2);
    expect(count("everyone-day|all|2026-10-16")).toBe(2);
    expect(
      counts.take(home("home-1"), new Date("2026-10-17T00:00:00Z")).ok,
    ).toBe(true);
  });

  test("yesterday's counts are deleted", () => {
    const { counts, db } = ledger();
    counts.take(home("home-1"), new Date("2026-10-16T09:00:00Z"));
    counts.take(home("home-2"), new Date("2026-10-17T09:00:00Z"));
    const keys = (
      db.query("SELECT key FROM counts ORDER BY key").all() as { key: string }[]
    ).map((row) => row.key);
    expect(keys).toEqual([
      "address-day|addr-1|2026-10-17",
      "everyone-day|all|2026-10-17",
      "household-day|home-2|2026-10-17",
      "household-month|home-1|2026-10",
      "household-month|home-2|2026-10",
    ]);
  });

  test("an address is kept only as a keyed hash", async () => {
    const key = await addressKey("secret-1", "203.0.113.7");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await addressKey("secret-1", "203.0.113.7")).toBe(key);
    expect(await addressKey("secret-2", "203.0.113.7")).not.toBe(key);
    expect(await addressKey("secret-1", "203.0.113.8")).not.toBe(key);
  });
});
