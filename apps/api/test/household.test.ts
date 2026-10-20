import { beforeEach, describe, expect, test } from "bun:test";
import { createHousehold } from "../src/household/routes.js";
import { pull, push } from "../src/household/sync.js";
import { linkStatus } from "../src/messenger/links.js";
import {
  as,
  DISH,
  home,
  MAYUR,
  PLAN,
  signedInAs,
  view,
} from "./household-flow.js";
import { record } from "./household-support.js";
import { linked } from "./messenger-flow.js";
import { ask, type Harness, harness } from "./messenger-support.js";

// specs/217, criteria 10 to 12: a household made from a phone's records,
// push takes the newer version, pull pages the changes. The session is a
// cookie; the stores are the fakes that mirror migrations 0004 and 0005.

const DAY = 86_400_000;
let h: Harness;
beforeEach(() => {
  h = harness();
});

describe("10. a household is made from a phone's records", () => {
  test("201; every record at its version; one change each; the account a planner", async () => {
    const session = await signedInAs(h, MAYUR);
    const response = await createHousehold(
      as(session, "POST", "/api/household", { records: [PLAN, DISH] }),
      h.deps,
    );
    expect(response.status).toBe(201);
    const { id } = (await response.json()) as { id: string };
    expect(id).toBeTruthy();
    expect(
      h.households.records.map((r) => [r.collection, r.id, r.record.version]),
    ).toEqual([
      ["plans", "p-1", 1],
      ["my-dishes", "d-1", 1],
    ]);
    expect(h.households.changes).toHaveLength(2);
    expect(await view(h, session)).toEqual({
      id,
      members: [
        {
          id: expect.any(String) as string,
          role: "plan",
          kind: "account",
          name: "Mayur",
          stopped: false,
        },
      ],
    });
  });

  test("with a cook link's token, her conversation becomes a member, and the link no longer answers", async () => {
    const cook = await linked(h);
    const session = await signedInAs(h, MAYUR);
    const response = await createHousehold(
      as(session, "POST", "/api/household", {
        records: [],
        cookToken: cook.token,
      }),
      h.deps,
    );
    expect(response.status).toBe(201);
    const { members } = await view(h, session);
    expect(members.map((m) => [m.role, m.kind])).toEqual([
      ["plan", "account"],
      ["cook", "telegram"],
    ]);
    const old = await linkStatus(
      ask("GET", `/api/messenger/links/${cook.code}`, undefined, cook.token),
      h.deps,
    );
    expect(await old.json()).toEqual({ state: "gone" });
    expect(await h.store.find("fake", "chat-1")).not.toBeNull();
  });

  test("an account that already has a household: 409; no session: 401", async () => {
    const { session } = await home(h);
    const again = await createHousehold(
      as(session, "POST", "/api/household", { records: [] }),
      h.deps,
    );
    expect(again.status).toBe(409);
    const nobody = await createHousehold(
      ask("POST", "/api/household", { records: [] }),
      h.deps,
    );
    expect(nobody.status).toBe(401);
  });
});

describe("11. push takes the newer version", () => {
  test("a higher version is stored and logged; a lower or equal one is refused with the server's copy", async () => {
    const { session } = await home(h);
    const newer = record("plans", "p-1", { dish: "dal" }, 4);
    const pushed = await push(
      as(session, "POST", "/api/sync/push", { records: [newer] }),
      h.deps,
    );
    expect(pushed.status).toBe(200);
    expect(await pushed.json()).toEqual({ refused: [] });
    expect(
      h.households.records.find((r) => r.id === "p-1")?.record.version,
    ).toBe(4);
    expect(h.households.changes).toHaveLength(3);

    for (const version of [4, 2]) {
      const older = record("plans", "p-1", { dish: "bhindi" }, version);
      const refused = await push(
        as(session, "POST", "/api/sync/push", { records: [older] }),
        h.deps,
      );
      expect(refused.status).toBe(200);
      expect(await refused.json()).toEqual({
        refused: [{ collection: "plans", record: newer.record }],
      });
    }
    expect(h.households.changes).toHaveLength(3);
  });

  test("no household yet: 403; more than 500 records: 413", async () => {
    const session = await signedInAs(h, MAYUR);
    const none = await push(
      as(session, "POST", "/api/sync/push", { records: [PLAN] }),
      h.deps,
    );
    expect(none.status).toBe(403);
    await createHousehold(
      as(session, "POST", "/api/household", { records: [] }),
      h.deps,
    );
    const many = Array.from({ length: 501 }, (_, i) =>
      record("plans", `p-${String(i)}`, {}),
    );
    const over = await push(
      as(session, "POST", "/api/sync/push", { records: many }),
      h.deps,
    );
    expect(over.status).toBe(413);
  });
});

interface Page {
  changes: { seq: number; record: { id: string; deletedAt: string | null } }[];
  cursor: number;
  more: boolean;
  reset: boolean;
}
const page = async (h: Harness, session: string, after: string) =>
  (await (
    await pull(as(session, "GET", `/api/sync/changes?after=${after}`), h.deps)
  ).json()) as Page;

describe("12. pull pages the changes", () => {
  test("500 a page with a cursor; a deleted record carries its deletedAt", async () => {
    const { session } = await home(h);
    const many = Array.from({ length: 498 }, (_, i) =>
      record("plans", `q-${String(i)}`, {}),
    );
    await push(
      as(session, "POST", "/api/sync/push", { records: many }),
      h.deps,
    );
    const gone = record("my-dishes", "d-1", { name: "Paneer bhurji" }, 2);
    gone.record.deletedAt = "2026-10-21T08:00:00.000Z";
    await push(
      as(session, "POST", "/api/sync/push", { records: [gone] }),
      h.deps,
    );

    const first = await page(h, session, "0");
    expect(first.changes).toHaveLength(500);
    expect(first.more).toBe(true);
    expect(first.cursor).toBe(500);
    const second = await page(h, session, String(first.cursor));
    expect(second.changes).toHaveLength(1);
    expect(second.more).toBe(false);
    expect(second.changes[0]?.record).toMatchObject({
      id: "d-1",
      deletedAt: "2026-10-21T08:00:00.000Z",
    });
    const third = await page(h, session, String(second.cursor));
    expect(third.changes).toEqual([]);
  });

  test("a cursor older than the kept changes: start over, with every record", async () => {
    const { session } = await home(h);
    // The nightly job, 91 days on; the phone's session is kept alive by use.
    await h.deps.households.housekeeping(
      new Date(h.clock.now + 91 * DAY).toISOString(),
    );
    const reset = await page(h, session, "1");
    expect(reset.reset).toBe(true);
    expect(reset.more).toBe(false);
    expect(reset.changes.map((c) => c.record.id).sort()).toEqual([
      "d-1",
      "p-1",
    ]);
  });

  test("no household: 403; a bad cursor: 400", async () => {
    const session = await signedInAs(h, MAYUR);
    expect(
      (await pull(as(session, "GET", "/api/sync/changes?after=0"), h.deps))
        .status,
    ).toBe(403);
    await createHousehold(
      as(session, "POST", "/api/household", { records: [] }),
      h.deps,
    );
    expect(
      (await pull(as(session, "GET", "/api/sync/changes?after=x"), h.deps))
        .status,
    ).toBe(400);
  });
});
