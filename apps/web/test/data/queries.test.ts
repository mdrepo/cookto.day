import { afterEach, describe, expect, test } from "bun:test";
import { createChanges } from "@cookto/data";
import {
  onlineManager,
  type QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { createQueries } from "../../src/queries.js";

// specs/65-onboarding.md, step 3 of "How it lands", in ADR 0024's words:
// screens read saved data through TanStack Query, and a saved change
// refreshes whatever shows it.

const KEY = ["household", "members"];

/** A part of a screen showing `key`: returns how to stop showing it. */
function show(
  client: QueryClient,
  key: readonly string[],
  read: (signal: AbortSignal) => Promise<unknown>,
) {
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: ({ signal }) => read(signal),
  });
  const stop = observer.subscribe(() => undefined);
  return { observer, stop };
}

/** Waits until `ready` is true, or fails after a second. */
async function until(ready: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !ready(); i++)
    await new Promise((r) => setTimeout(r, 10));
  expect(ready()).toBe(true);
}

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  onlineManager.setOnline(true);
});

function setUp() {
  const changes = createChanges();
  const client = createQueries(changes);
  let reads = 0;
  const read = () => {
    reads += 1;
    return Promise.resolve([{ id: "a", meals: ["lunch"] }]);
  };
  return { changes, client, read, reads: () => reads };
}

describe("reading saved data", () => {
  test("a saved change refreshes what shows it", async () => {
    const { changes, client, read, reads } = setUp();
    stops.push(show(client, KEY, read).stop);
    await until(() => reads() === 1);
    changes.announce("household");
    await until(() => reads() === 2);
  });

  test("a change to something else leaves it alone", async () => {
    const { changes, client, read, reads } = setUp();
    const { observer, stop } = show(client, KEY, read);
    stops.push(stop);
    await until(() => observer.getCurrentResult().isSuccess);
    changes.announce("pantry");
    await new Promise((r) => setTimeout(r, 50));
    expect(reads()).toBe(1);
  });

  test("saved data reads with the phone offline", async () => {
    onlineManager.setOnline(false);
    const { client, read } = setUp();
    const { observer, stop } = show(client, KEY, read);
    stops.push(stop);
    await until(() => observer.getCurrentResult().isSuccess);
  });

  test("two parts asking at once make one read", async () => {
    const { client, read, reads } = setUp();
    const one = show(client, KEY, read);
    const two = show(client, KEY, read);
    stops.push(one.stop, two.stop);
    await until(() => two.observer.getCurrentResult().isSuccess);
    expect(reads()).toBe(1);
  });

  test("leaving a screen cancels its read", async () => {
    const { client } = setUp();
    let seen: AbortSignal | undefined;
    const { stop } = show(client, KEY, (signal) => {
      seen = signal;
      return new Promise(() => undefined); // never answers
    });
    await until(() => seen !== undefined);
    stop();
    expect(seen?.aborted).toBe(true);
  });

  test("a refresh keeps what didn't change as it was", async () => {
    const { changes, client } = setUp();
    let round = 0;
    const { observer, stop } = show(client, KEY, () => {
      round += 1;
      return Promise.resolve([
        { id: "a", meals: ["lunch"] },
        { id: "b", meals: round === 1 ? ["lunch"] : ["dinner"] },
      ]);
    });
    stops.push(stop);
    await until(() => observer.getCurrentResult().isSuccess);
    const [a1, b1] = observer.getCurrentResult().data as object[];
    changes.announce("household");
    await until(() => round === 2 && !observer.getCurrentResult().isFetching);
    const [a2, b2] = observer.getCurrentResult().data as object[];
    expect(a2).toBe(a1);
    expect(b2).not.toBe(b1);
  });
});
