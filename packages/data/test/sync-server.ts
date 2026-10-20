import {
  ApiError,
  type Pulled,
  type PushedRecord,
  type SyncApi,
} from "../src/network.js";

// The server as the sync tests play it (specs/217): records whole at their
// version, newer wins, the rest refused with the server's copy; a changes
// log with one sequence, paged. The same rules as the API's.

export interface FakeServer extends SyncApi {
  records: Map<string, PushedRecord>;
  log: { seq: number; collection: string; record: PushedRecord["record"] }[];
  pushes: PushedRecord[][];
  pulls: number[];
  /** Changes a page, so paging can be seen with few records. */
  page: number;
  /** The next calls fail with this, once each. */
  fail: (...errors: ApiError[]) => void;
  /** Holds the next answer until released, to play two syncs at once. */
  hold: () => () => void;
  /** A change the server itself made (another phone). */
  put: (collection: string, record: PushedRecord["record"]) => void;
  /** Forget changes up to `seq`: a phone with an older cursor starts over. */
  purge: (seq: number) => void;
}

export function fakeServer(): FakeServer {
  const records = new Map<string, PushedRecord>();
  const log: FakeServer["log"] = [];
  const pushes: PushedRecord[][] = [];
  const pulls: number[] = [];
  const failures: ApiError[] = [];
  let seq = 0;
  let purgedThrough = 0;
  let gate: Promise<void> | null = null;
  const key = (c: string, id: string) => `${c}/${id}`;

  async function wait() {
    if (gate) await gate;
    const failure = failures.shift();
    if (failure) throw failure;
  }

  function put(collection: string, record: PushedRecord["record"]) {
    records.set(key(collection, record.id), { collection, record });
    log.push({ seq: ++seq, collection, record });
  }

  return {
    records,
    log,
    pushes,
    pulls,
    page: 500,
    fail: (...errors) => {
      failures.push(...errors);
    },
    hold: () => {
      let release: () => void = () => undefined;
      gate = new Promise<void>((resolve) => {
        release = () => {
          gate = null;
          resolve();
        };
      });
      return release;
    },
    put,
    purge: (upTo) => {
      purgedThrough = upTo;
      for (let i = log.length - 1; i >= 0; i--)
        if ((log[i]?.seq ?? 0) <= upTo) log.splice(i, 1);
    },
    async push(pushed) {
      await wait();
      pushes.push(pushed);
      const refused: PushedRecord[] = [];
      for (const p of pushed) {
        const have = records.get(key(p.collection, p.record.id));
        if (have && have.record.version >= p.record.version) refused.push(have);
        else put(p.collection, p.record);
      }
      return { refused };
    },
    async changes(after): Promise<Pulled> {
      await wait();
      pulls.push(after);
      if (after < purgedThrough)
        return {
          changes: [...records.values()].map((r) => ({
            seq,
            collection: r.collection,
            record: r.record,
          })),
          cursor: seq,
          more: false,
          reset: true,
        };
      const mine = log.filter((c) => c.seq > after);
      const page = mine.slice(0, this.page);
      return {
        changes: page,
        cursor: page.at(-1)?.seq ?? after,
        more: mine.length > this.page,
        reset: false,
      };
    },
  };
}
