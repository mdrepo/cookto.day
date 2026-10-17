import { describe, expect, test } from "bun:test";
import type { LogEntry } from "../src/log.js";
import { readReceipt, type ReadDeps } from "../src/receipts/read.js";
import type { ReaderResult } from "../src/receipts/reader.js";
import {
  ADDRESS,
  fakeReader,
  jpeg,
  ledger,
  MINIMART,
  png,
  post,
  signedIn,
  signedOut,
  webp,
} from "./support.js";

// specs/129-receipt-photos.md, rules 1 to 8: POST /api/receipts/read, from
// the switch to the log line. The counters are real; sign-in and the AI are
// faked at their edges.

const READ: ReaderResult = {
  ok: true,
  output: MINIMART,
  tokensIn: 291,
  tokensOut: 595,
};

function setUp(overrides: Partial<ReadDeps> = {}, result = READ) {
  const counts = ledger("2026-10-16T09:00:00Z");
  const ai = fakeReader(result);
  const logged: LogEntry[] = [];
  const deps: ReadDeps = {
    reader: ai.reader,
    auth: signedIn,
    usage: counts.usage,
    strikes: counts.strikes,
    log: (entry) => logged.push(entry),
    now: () => counts.clock.now.getTime(),
    ...overrides,
  };
  const read = (request = post(jpeg())) => readReceipt(request, deps);
  return { read, ai, logged, counted: counts.counted };
}

const body = async (response: Response) =>
  (await response.json()) as Record<string, unknown>;

describe("POST /api/receipts/read", () => {
  test("is off until switched on with a key: 503, and nothing is called", async () => {
    const { read, counted } = setUp({ reader: null });
    const response = await read();
    expect(response.status).toBe(503);
    expect(await body(response)).toEqual({ error: "off" });
    expect(counted()).toBe(0);
  });

  test("answers only our page, and only someone signed in", async () => {
    const elsewhere = setUp();
    const forged = await elsewhere.read(
      post(jpeg(), { origin: "https://evil.example" }),
    );
    expect(forged.status).toBe(403);
    expect((await elsewhere.read(post(jpeg(), { origin: "" }))).status).toBe(
      403,
    );
    expect(elsewhere.ai.seen).toHaveLength(0);
    expect(elsewhere.counted()).toBe(0);

    const out = setUp({ auth: signedOut });
    const response = await out.read();
    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ error: "signed-out" });
    expect(out.ai.seen).toHaveLength(0);
    expect(out.counted()).toBe(0);
  });

  test("takes one JPEG or WebP of up to 1.5 MB, judged by its bytes, and counts nothing else", async () => {
    const { read, ai, counted } = setUp();
    expect((await read(post(jpeg(1_500_001)))).status).toBe(413);
    const streamed = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(jpeg(1_000_000));
        controller.enqueue(new Uint8Array(1_000_000));
        controller.close();
      },
    });
    expect((await read(post(streamed))).status).toBe(413);
    expect((await read(post(png()))).status).toBe(415);
    expect((await read(post("not a photo"))).status).toBe(415);
    expect(ai.seen).toHaveLength(0);
    expect(counted()).toBe(0);

    expect(
      (await read(post(webp(), { "content-type": "image/jpeg" }))).status,
    ).toBe(200);
    expect(ai.seen.map((photo) => photo.type)).toEqual(["image/webp"]);
    expect(ai.seen[0]?.bytes).toEqual(webp());
  });

  test("a household's fourth read today is 429, saying which limit and when it resets", async () => {
    const { read, ai } = setUp();
    for (let i = 0; i < 3; i++) expect((await read()).status).toBe(200);
    const response = await read();
    expect(response.status).toBe(429);
    expect(await body(response)).toEqual({
      error: "limit",
      limit: "household-day",
      resetsAt: "2026-10-17T00:00:00Z",
    });
    expect(response.headers.get("retry-after")).toBe(String(15 * 60 * 60));
    expect(ai.seen).toHaveLength(3);
  });

  test("a read the AI couldn't do is 502, and is given back", async () => {
    const { read, counted } = setUp({}, { ok: false, reason: "unavailable" });
    const response = await read();
    expect(response.status).toBe(502);
    expect(await body(response)).toEqual({ error: "reader" });
    expect(counted()).toBe(0);
  });

  test("returns only checked lines; a photo that isn't a receipt is 422, and still counts", async () => {
    const good = setUp();
    const response = await good.read();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const receipt = await body(response);
    expect(Object.keys(receipt).sort()).toEqual([
      "addsUp",
      "date",
      "lines",
      "shop",
    ]);
    expect((receipt["lines"] as unknown[]).length).toBe(11);

    for (const result of [
      { ...READ, output: { lines: [] } },
      { ...READ, output: "a poem" },
    ] as ReaderResult[]) {
      const { read, counted } = setUp({}, result);
      const refused = await read();
      expect(refused.status).toBe(422);
      expect(await body(refused)).toEqual({ error: "not-a-receipt" });
      expect(counted()).toBeGreaterThan(0);
      expect((await read()).status).toBe(422);
    }
  });

  test("signs of abuse are 422 'rejected', end the household's day, and the log says which", async () => {
    const cases: [ReaderResult, string, number][] = [
      [
        { ok: false, reason: "cut-off", tokensIn: 291, tokensOut: 2560 },
        "cut-off",
        2560,
      ],
      [
        { ok: false, reason: "unreadable", tokensIn: 291, tokensOut: 12 },
        "unreadable",
        12,
      ],
      [
        {
          ...READ,
          output: {
            ...MINIMART,
            lines: ["TOMATO|1||1.60", "CALL +65 9123 4567|1||0"],
          },
        },
        "contact",
        595,
      ],
      [
        { ...READ, output: { lines: [`${"A".repeat(200)}|1||1.00`] } },
        "long-line",
        595,
      ],
    ];
    for (const [result, sign, tokensOut] of cases) {
      const { read, ai, logged } = setUp({}, result);
      const refused = await read();
      expect(refused.status).toBe(422);
      expect(await body(refused)).toEqual({ error: "rejected" });
      expect(logged).toEqual([
        {
          route: "receipts/read",
          status: 422,
          error: "rejected",
          sign,
          ms: 0,
          tokensIn: 291,
          tokensOut,
        },
      ]);

      const next = await read();
      expect(next.status).toBe(429);
      expect(await body(next)).toMatchObject({ limit: "household-day" });
      expect(ai.seen).toHaveLength(1);
    }
  });

  test("logs one line per call: the outcome, time, lines and tokens, never content", async () => {
    const { read, logged } = setUp();
    await read();
    await read(post(png()));
    expect(logged).toEqual([
      {
        route: "receipts/read",
        status: 200,
        ms: 0,
        lines: 11,
        tokensIn: 291,
        tokensOut: 595,
      },
      { route: "receipts/read", status: 415, error: "type", ms: 0 },
    ]);
    const text = JSON.stringify(logged);
    for (const secret of [ADDRESS, "home-1", "acct-1", "PANEER", "MINIMART"])
      expect(text).not.toContain(secret);
  });

  test("if the counter fails, nothing is read: 500, in JSON, and logged", async () => {
    const broken = () => Promise.reject(new Error("counter unreachable"));
    const { read, ai, logged } = setUp({
      usage: { take: broken, giveBack: broken },
    });
    const response = await read();
    expect(response.status).toBe(500);
    expect(await body(response)).toEqual({ error: "server" });
    expect(ai.seen).toHaveLength(0);
    expect(logged).toEqual([
      { route: "receipts/read", status: 500, error: "server", ms: 0 },
    ]);
  });
});
