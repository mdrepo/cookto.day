import { afterAll } from "bun:test";
import { functionRuns } from "../src/runs.js";
import { memoryRuns, type RunMember } from "../src/runs-memory.js";
import { runsContract } from "./runs-contract.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/234, criterion 12: the runs contract in memory, always, and on
// Postgres with every migration applied when a database is there (CI).

const T0 = "2026-10-21T15:00:00.000Z";

runsContract("memory", () => {
  const homes = new Set(["home-1"]);
  let queued = 0;
  const members: RunMember[] = [
    {
      id: "mem-plan",
      household: "home-1",
      account: "acc-1",
      role: "plan",
      conversation: "conv-plan",
    },
    {
      id: "mem-cook",
      household: "home-1",
      account: null,
      role: "cook",
      conversation: "conv-cook",
    },
  ];
  const runs = memoryRuns({
    members: () => members.filter((m) => homes.has(m.household)),
    households: () => homes,
    queue: (outgoing) => {
      queued += outgoing.length;
      return Promise.resolve(outgoing.map((_, i) => `m-${String(queued + i)}`));
    },
  });
  return Promise.resolve({
    runs,
    household: "home-1",
    planner: {
      member: "mem-plan",
      account: "acc-1",
      conversation: "conv-plan",
    },
    cook: { member: "mem-cook", conversation: "conv-cook" },
    queued: () => Promise.resolve(queued),
    dropHousehold: () => {
      homes.delete("home-1");
      return Promise.resolve();
    },
  });
});

const sql = DATABASE_URL ? connect() : null;
afterAll(async () => {
  await sql?.close();
});

if (sql) {
  runsContract("postgres", async () => {
    await allow(sql);
    await wipe(sql);
    const [account] = await sql<{ id: string }[]>`
      insert into accounts (created_at) values (${T0}) returning id`;
    const [home] = await sql<{ id: string }[]>`
      insert into households (created_at) values (${T0}) returning id`;
    const conversation = async (chat: string) => {
      const [c] = await sql<{ id: string }[]>`
        insert into conversations (channel, chat, owner_kind, owner_id, started_at)
        values ('telegram', ${chat}, 'member', 'x', ${T0}) returning id`;
      return c?.id ?? "";
    };
    const member = async (
      role: string,
      accountId: string | null,
      conv: string,
    ) => {
      const [m] = await sql<{ id: string }[]>`
        insert into members (household, account, chat, conversation, role, joined_at)
        values (${home?.id}, ${accountId}, null, ${conv}, ${role}, ${T0}) returning id`;
      return m?.id ?? "";
    };
    const planConv = await conversation("c-plan");
    const cookConv = await conversation("c-cook");
    const planner = await member("plan", account?.id ?? null, planConv);
    const cook = await member("cook", null, cookConv);
    return {
      runs: functionRuns(sqlCall(sql), SECRET),
      household: home?.id ?? "",
      planner: {
        member: planner,
        account: account?.id ?? "",
        conversation: planConv,
      },
      cook: { member: cook, conversation: cookConv },
      queued: async () => {
        const [row] = await sql<{ n: number }[]>`
          select count(*)::int as n from outbox`;
        return row?.n ?? 0;
      },
      dropHousehold: async () => {
        await sql`delete from households where id = ${home?.id}`;
      },
    };
  });
}
