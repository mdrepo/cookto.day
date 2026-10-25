import type { Households, InviteStarted, PushedRecord } from "@cookto/db";
import type { Store } from "@cookto/messenger";
import type { FakeAuth } from "./auth-support.js";
import { HouseholdState } from "./household-state.js";

// Households kept in memory the way db/migrations/0005 keeps them (spec
// #217): the `Households` interface over household-state.ts. The API's
// tests run on this; db/test/household.test.ts runs the same rules on
// Postgres.

export interface FakeHouseholds extends HouseholdState {
  households: Households;
}

export function fakeHouseholds(
  store: Store,
  auth: FakeAuth,
  cookLinks: {
    rows: Map<string, { tokenHash: string; conversation: string | null }>;
  },
): FakeHouseholds {
  const s = new HouseholdState(auth);
  const day = (now: string) => now.slice(0, 10);

  async function removeConversations(ids: (string | null)[]) {
    for (const id of ids) if (id !== null) await store.remove(id);
  }

  const households: Households = {
    create: (account, pushed, now) => {
      if (s.of(account))
        return Promise.resolve({ ok: false, reason: "exists" });
      const id = s.next("home");
      s.rows.set(id, { id, sendsOn: "", sends: 0, purgedThrough: 0 });
      s.members.push({
        id: s.next("mem"),
        household: id,
        account,
        chat: null,
        conversation: null,
        role: "plan",
      });
      s.take(id, pushed, now);
      return Promise.resolve({ ok: true, household: id });
    },
    claimCook: async (account, tokenHash) => {
      const me = s.of(account);
      const link = [...cookLinks.rows.entries()].find(
        ([, l]) => l.tokenHash === tokenHash,
      );
      if (!me || !link || link[1].conversation === null) return { ok: false };
      const c = await store.get(link[1].conversation);
      if (!c) return { ok: false };
      s.members.push({
        id: s.next("mem"),
        household: me.household,
        account: null,
        chat: c.chat,
        conversation: c.id,
        role: "cook",
      });
      cookLinks.rows.delete(link[0]);
      return { ok: true };
    },
    get: (account) => {
      const me = s.of(account);
      return Promise.resolve(me ? s.view(me.household) : null);
    },
    invite: (account, role, _addressHash, now) => {
      const me = s.of(account);
      if (!me) return Promise.resolve({ ok: false, reason: "no-household" });
      const code = `IN7Q4HT${String.fromCharCode(65 + (++s.n % 26))}`;
      const expiresAt = new Date(Date.parse(now) + 600_000).toISOString();
      s.invites.set(code, {
        code,
        household: me.household,
        role,
        expiresAt,
        usedAt: null,
      });
      return Promise.resolve({
        ok: true,
        code,
        token: `invite-token-${String(s.n)}`,
        expiresAt,
      });
    },
    startInvite: async (code, channel, chat, from, now) => {
      const inv = s.invites.get(code.replace("-", "").toUpperCase());
      if (!inv) return { ok: false, reason: "not-invite" };
      if (inv.usedAt !== null || inv.expiresAt < now)
        return { ok: false, reason: "bad" };
      if (inv.role === "plan" && from === null)
        return { ok: false, reason: "bad" };
      inv.usedAt = now;
      if (inv.role === "cook") {
        const member = s.next("mem");
        const c = await store.open(
          channel,
          chat,
          { kind: "member", id: member },
          now,
        );
        s.members.push({
          id: member,
          household: inv.household,
          account: null,
          chat,
          conversation: c.id,
          role: "cook",
          name: from?.name ?? null,
        });
        const started: InviteStarted = {
          ok: true,
          role: "cook",
          conversation: c,
        };
        return started;
      }
      let identity = auth.identities.find(
        (i) => i.channel === channel && i.userId === from?.id,
      );
      if (!identity) {
        const account = `acct-${String(auth.accounts.size + 1)}`;
        auth.accounts.add(account);
        identity = {
          channel,
          userId: from?.id ?? "",
          account,
          name: from?.name ?? "",
        };
        auth.identities.push(identity);
      }
      if (!s.of(identity.account))
        s.members.push({
          id: s.next("mem"),
          household: inv.household,
          account: identity.account,
          chat,
          conversation: null,
          role: "plan",
        });
      return { ok: true, role: "plan" };
    },
    removeMember: async (account, member) => {
      const me = s.of(account);
      const i = s.members.findIndex(
        (m) => m.id === member && me !== null && m.household === me.household,
      );
      if (i < 0) return { ok: false };
      const [gone] = s.members.splice(i, 1);
      await removeConversations([gone?.conversation ?? null]);
      return { ok: true, chat: gone?.chat ?? null };
    },
    cooks: async (account, now) => {
      const me = s.of(account);
      const h = me ? s.rows.get(me.household) : undefined;
      if (!me || !h) return { ok: false, reason: "no-household" };
      const conversations: string[] = [];
      for (const m of s.members) {
        if (m.household !== me.household || m.role !== "cook") continue;
        // A conversation /stop deleted is gone for the member too.
        if (
          m.conversation !== null &&
          (await store.get(m.conversation)) === null
        )
          m.conversation = null;
        if (m.conversation !== null) conversations.push(m.conversation);
      }
      if (conversations.length === 0) return { ok: false, reason: "no-cook" };
      if (h.sendsOn !== day(now)) {
        h.sendsOn = day(now);
        h.sends = 0;
      }
      if (h.sends >= 20) return { ok: false, reason: "limit" };
      h.sends++;
      return { ok: true, conversations };
    },
    deleteAccount: async (account) => {
      const me = s.of(account);
      for (let i = auth.identities.length - 1; i >= 0; i--)
        if (auth.identities[i]?.account === account)
          auth.identities.splice(i, 1);
      for (const [hash, session] of auth.sessions)
        if (session.account === account) auth.sessions.delete(hash);
      auth.accounts.delete(account);
      if (!me) return { household: false };
      s.members.splice(s.members.indexOf(me), 1);
      const planners = s.members.filter(
        (m) => m.household === me.household && m.account !== null,
      );
      if (planners.length > 0) return { household: false };
      await removeConversations(
        s.members
          .filter((m) => m.household === me.household)
          .map((m) => m.conversation),
      );
      s.drop(me.household);
      return { household: true };
    },
    push: (account, pushed, now) => {
      const me = s.of(account);
      if (!me) return Promise.resolve({ ok: false, reason: "forbidden" });
      return Promise.resolve({
        ok: true,
        refused: s.take(me.household, pushed, now),
      });
    },
    changes: (account, after, limit) => {
      const me = s.of(account);
      return Promise.resolve(me ? s.page(me.household, after, limit) : null);
    },
    housekeeping: (now) => Promise.resolve({ changes: s.purge(now) }),
    records: (household, collection) =>
      Promise.resolve(
        s.records
          .filter(
            (r) => r.household === household && r.collection === collection,
          )
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .map((r) => structuredClone(r.record)),
      ),
    list: () =>
      Promise.resolve(
        [...s.rows.values()].map((r) => ({
          id: r.id,
          botOff: r.botOff ?? false,
        })),
      ),
    put: (household, pushed, now) =>
      Promise.resolve(s.take(household, pushed, now)),
    people: (household) =>
      Promise.resolve(
        s.members
          .filter((m) => m.household === household)
          .map((m) => ({
            id: m.id,
            role: m.role,
            name: m.name ?? s.nameOf(m.account),
            conversation: m.conversation,
          })),
      ),
    whose: (member) => {
      const m = s.members.find((x) => x.id === member);
      return Promise.resolve(
        m ? { household: m.household, role: m.role } : null,
      );
    },
    nameCook: (member, name) => {
      const m = s.members.find((x) => x.id === member && x.role === "cook");
      if (m) m.name = name;
      return Promise.resolve();
    },
    reachPlanners: async (household, channel, now) => {
      for (const m of s.members) {
        if (m.household !== household || m.role !== "plan") continue;
        if (m.conversation !== null || m.account === null) continue;
        // A private chat's id is its person's id, on Telegram.
        const who = auth.identities.find(
          (i) => i.account === m.account && i.channel === channel,
        );
        if (!who) continue;
        const c = await store.open(
          channel,
          who.userId,
          { kind: "member", id: m.id },
          now,
        );
        m.conversation = c.id;
        m.chat = who.userId;
      }
    },
  };
  return Object.assign(s, { households });
}

/** A record as a phone pushes it: its collection, and the record whole. */
export function record(
  collection: string,
  id: string,
  fields: Record<string, unknown>,
  version = 1,
  updatedAt = "2026-10-20T19:00:00.000Z",
): PushedRecord {
  return {
    collection,
    record: { id, version, updatedAt, deletedAt: null, ...fields },
  };
}
