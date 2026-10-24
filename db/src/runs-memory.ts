import type { NewRun, NextStep, Outgoing, RunRow, Runs } from "./runs.js";

// Runs in memory, by the same rules as db/migrations/0007 (ADR 0034), for
// the API's tests; db/test/runs.test.ts holds both to one contract. The
// members and households come from whoever keeps them; queueing a run's
// messages is the caller's, as the messenger's store does it.

export interface RunMember {
  id: string;
  household: string;
  account: string | null;
  role: "plan" | "cook";
  conversation: string | null;
}

export interface MemoryRunsOptions {
  members: () => RunMember[];
  /** The households that exist: a run of one gone is gone. */
  households: () => Set<string>;
  /** Records and queues the messages; their ids. */
  queue: (outgoing: Outgoing[]) => Promise<string[]>;
}

/** Kept in the order made, as Postgres orders by created_at. */
type Row = RunRow;

const copy = (row: Row): RunRow => ({
  ...row,
  about: { ...row.about },
  messages: [...row.messages],
});

class MemoryRuns implements Runs {
  private readonly rows = new Map<string, Row>();
  private readonly off = new Set<string>();

  constructor(private readonly o: MemoryRunsOptions) {}

  private live(): Row[] {
    const homes = this.o.households();
    return [...this.rows.values()].filter((r) => homes.has(r.household));
  }

  private find(id: string): Row | undefined {
    return this.live().find((r) => r.id === id);
  }

  private static speaksTo(r: RunRow, m: RunMember): boolean {
    return (
      m.household === r.household &&
      (m.id === r.audience ||
        (r.audience === "planners" && m.role === "plan") ||
        (r.audience === "cooks" && m.role === "cook"))
    );
  }

  create(run: NewRun): Promise<RunRow> {
    const row: Row = {
      id: run.id,
      household: run.household,
      audience: run.audience,
      workflow: run.workflow,
      step: null,
      about: { ...run.about },
      status: "due",
      rev: 0,
      lease: null,
      dueAt: run.dueAt,
      expiresAt: run.expiresAt,
      floor: false,
      messages: [],
    };
    this.rows.set(run.id, row);
    return Promise.resolve(copy(row));
  }

  get(id: string): Promise<(RunRow & { botOff: boolean }) | null> {
    const r = this.find(id);
    return Promise.resolve(
      r ? { ...copy(r), botOff: this.off.has(r.household) } : null,
    );
  }

  open(member: string): Promise<RunRow[]> {
    const m = this.o.members().find((x) => x.id === member);
    return Promise.resolve(
      this.live()
        .filter((r) => m && r.status === "waiting" && MemoryRuns.speaksTo(r, m))
        .map(copy),
    );
  }

  conversations(id: string): Promise<string[]> {
    const r = this.find(id);
    return Promise.resolve(
      this.o
        .members()
        .filter((m) => r && MemoryRuns.speaksTo(r, m))
        .flatMap((m) => (m.conversation === null ? [] : [m.conversation])),
    );
  }

  claim(
    id: string,
    step: string | null,
    rev: number,
    now: string,
    until: string,
  ): Promise<RunRow | null> {
    const r = this.find(id);
    const open = r?.status === "due" || r?.status === "waiting";
    const free = r?.lease === null || (r?.lease ?? "") <= now;
    if (!r || !open || !free || r.rev !== rev || r.step !== step)
      return Promise.resolve(null);
    r.rev += 1;
    r.lease = until;
    return Promise.resolve(copy(r));
  }

  async commit(
    id: string,
    rev: number,
    next: NextStep,
    outgoing: Outgoing[],
  ): Promise<{ ok: boolean; ids: string[] }> {
    const r = this.find(id);
    if (!r || r.rev !== rev || r.lease === null) return { ok: false, ids: [] };
    const ids = await this.o.queue(outgoing);
    Object.assign(r, next, { rev: r.rev + 1, lease: null, messages: ids });
    return { ok: true, ids };
  }

  due(now: string): Promise<RunRow[]> {
    const live = this.live();
    const holding = (r: RunRow) =>
      live.some(
        (x) =>
          x.household === r.household &&
          x.audience === r.audience &&
          x.status === "waiting" &&
          x.floor,
      );
    return Promise.resolve(
      live
        .filter(
          (r) =>
            r.status === "due" &&
            r.dueAt <= now &&
            !this.off.has(r.household) &&
            !holding(r),
        )
        .sort(
          (a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id),
        )
        .map(copy),
    );
  }

  expired(now: string): Promise<RunRow[]> {
    return Promise.resolve(
      this.live()
        .filter(
          (r) =>
            r.status === "waiting" &&
            r.expiresAt !== null &&
            r.expiresAt <= now &&
            !this.off.has(r.household),
        )
        .map(copy),
    );
  }

  setBotOff(account: string, off: boolean): Promise<void> {
    const m = this.o.members().find((x) => x.account === account);
    if (m && off) this.off.add(m.household);
    if (m && !off) this.off.delete(m.household);
    return Promise.resolve();
  }
}

export function memoryRuns(o: MemoryRunsOptions): Runs {
  return new MemoryRuns(o);
}
