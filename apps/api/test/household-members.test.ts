import { beforeEach, describe, expect, test } from "bun:test";
import { me } from "../src/auth/routes.js";
import {
  createHousehold,
  deleteAccount,
  getHousehold,
  invite,
  removeMember,
} from "../src/household/routes.js";
import { pull, push } from "../src/household/sync.js";
import { webhook } from "../src/messenger/webhook.js";
import { WORDS } from "../src/messenger/words.js";
import {
  as,
  home,
  joined,
  MAYUR,
  PRIYA,
  signedInAs,
  view,
} from "./household-flow.js";
import { incoming } from "./messenger-flow.js";
import { ask, type Harness, harness } from "./messenger-support.js";

// specs/217, criteria 13 and 15: invites by role, pressed in the bot;
// removing a member and deleting an account, all the way down.

let h: Harness;
beforeEach(() => {
  h = harness();
});

describe("13. invites, by role", () => {
  test("the cook: Start with her code makes her a member, and the bot says connected", async () => {
    const { session } = await home(h);
    const made = await invite(
      as(session, "POST", "/api/household/links", { role: "cook" }),
      h.deps,
    );
    expect(made.status).toBe(201);
    const body = (await made.json()) as { code: string; token?: string };
    expect(body.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(body.token).toBeUndefined();
    const u = h.channel.update({
      id: "u-cook",
      chat: "chat-7",
      event: { kind: "started", code: body.code },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    expect(h.channel.deliveries.at(-1)).toMatchObject({
      chat: "chat-7",
      message: { kind: "text", text: WORDS.connected },
    });
    const { members } = await view(h, session);
    expect(members.at(-1)).toMatchObject({
      role: "cook",
      kind: "telegram",
      stopped: false,
    });
    expect((await h.store.find("fake", "chat-7"))?.owner.kind).toBe("member");
  });

  test("a planner: Start from user 7 makes or finds the account, joins, and the bot says you're in", async () => {
    const { session, id } = await home(h);
    await joined(h, session, "plan", "c-7", PRIYA);
    expect(h.channel.deliveries.at(-1)).toMatchObject({
      chat: "c-7",
      message: { kind: "text", text: WORDS.joined },
    });
    const { members } = await view(h, session);
    expect(members.map((m) => [m.role, m.name])).toEqual([
      ["plan", "Mayur"],
      ["plan", "Priya"],
    ]);
    // Priya signs in on her own phone and finds the household.
    const priya = await signedInAs(h, PRIYA, "c-7");
    expect((await view(h, priya)).id).toBe(id);
    expect(h.auth.accounts.size).toBe(2);
  });

  test("a used or old code didn't work, and nothing changes", async () => {
    const { session } = await home(h);
    const code = await joined(h, session, "cook", "chat-7");
    const again = h.channel.update({
      id: "u2",
      chat: "chat-8",
      event: { kind: "started", code },
    });
    await webhook(incoming(again), h.deps);
    await h.settle();
    expect(h.channel.deliveries.at(-1)).toMatchObject({
      chat: "chat-8",
      message: { kind: "text", text: WORDS.badCode },
    });
    expect(h.households.members.filter((m) => m.role === "cook")).toHaveLength(
      1,
    );
    const late = (await (
      await invite(
        as(session, "POST", "/api/household/links", { role: "cook" }),
        h.deps,
      )
    ).json()) as { code: string };
    h.clock.now += 11 * 60_000;
    const old = h.channel.update({
      id: "u3",
      chat: "chat-9",
      event: { kind: "started", code: late.code },
    });
    await webhook(incoming(old), h.deps);
    await h.settle();
    expect(h.channel.deliveries.at(-1)?.message).toEqual({
      kind: "text",
      text: WORDS.badCode,
    });
  });

  test("inviting needs a household; the role must be plan or cook", async () => {
    const session = await signedInAs(h, MAYUR);
    const none = await invite(
      as(session, "POST", "/api/household/links", { role: "cook" }),
      h.deps,
    );
    expect(none.status).toBe(403);
    await createHousehold(
      as(session, "POST", "/api/household", { records: [] }),
      h.deps,
    );
    const boss = await invite(
      as(session, "POST", "/api/household/links", { role: "boss" }),
      h.deps,
    );
    expect(boss.status).toBe(400);
  });
});

describe("15. removing and deleting", () => {
  /** Mayur's household with a cook and Priya, both signed in. */
  async function withCookAndPriya() {
    const { session, id } = await home(h);
    await joined(h, session, "cook", "chat-7");
    await joined(h, session, "plan", "c-7", PRIYA);
    h.channel.deliveries.length = 0;
    const priya = await signedInAs(h, PRIYA, "c-7");
    return { session, priya, id };
  }

  test("removing the cook: her membership, conversation and messages go, after the goodbye", async () => {
    const { session } = await withCookAndPriya();
    const cook = (await view(h, session)).members.find(
      (m) => m.role === "cook",
    );
    const gone = await removeMember(
      as(session, "DELETE", `/api/household/members/${cook?.id ?? ""}`),
      h.deps,
    );
    expect(gone.status).toBe(204);
    expect(h.channel.deliveries).toEqual([
      {
        chat: "chat-7",
        message: { kind: "text", text: WORDS.removed },
        edits: undefined,
      },
    ]);
    expect(await h.store.find("fake", "chat-7")).toBeNull();
    expect((await view(h, session)).members.map((m) => m.role)).toEqual([
      "plan",
      "plan",
    ]);
    const nobody = await removeMember(
      as(session, "DELETE", "/api/household/members/nobody"),
      h.deps,
    );
    expect(nobody.status).toBe(404);
  });

  test("deleting one planner's account: it's gone, the household stays", async () => {
    const { session, priya } = await withCookAndPriya();
    const deleted = await deleteAccount(
      as(priya, "DELETE", "/api/account"),
      h.deps,
    );
    expect(deleted.status).toBe(204);
    expect((await me(as(priya, "GET", "/api/auth/me"), h.deps)).status).toBe(
      401,
    );
    expect(h.auth.identities.map((i) => i.name)).toEqual(["Mayur"]);
    expect((await view(h, session)).members.map((m) => m.role)).toEqual([
      "plan",
      "cook",
    ]);
    expect(h.households.records).toHaveLength(2);
  });

  test("deleting the last planner's account: the household, its records, changes, members and conversations go too", async () => {
    const { session, priya } = await withCookAndPriya();
    await deleteAccount(as(priya, "DELETE", "/api/account"), h.deps);
    const deleted = await deleteAccount(
      as(session, "DELETE", "/api/account"),
      h.deps,
    );
    expect(deleted.status).toBe(204);
    expect(h.households.rows.size).toBe(0);
    expect(h.households.members).toEqual([]);
    expect(h.households.records).toEqual([]);
    expect(h.households.changes).toEqual([]);
    expect(await h.store.find("fake", "chat-7")).toBeNull();
    expect(h.auth.accounts.size).toBe(0);
    const nobody = await deleteAccount(ask("DELETE", "/api/account"), h.deps);
    expect(nobody.status).toBe(401);
  });
});

describe("the session", () => {
  test("every household route is 401 without one", async () => {
    const routes = [
      [getHousehold, "GET", "/api/household"],
      [invite, "POST", "/api/household/links"],
      [removeMember, "DELETE", "/api/household/members/x"],
      [push, "POST", "/api/sync/push"],
      [pull, "GET", "/api/sync/changes?after=0"],
    ] as const;
    for (const [fn, method, path] of routes) {
      const body = method === "POST" ? {} : undefined;
      const response = await fn(ask(method, path, body), h.deps);
      expect([path, response.status]).toEqual([path, 401]);
    }
  });
});
