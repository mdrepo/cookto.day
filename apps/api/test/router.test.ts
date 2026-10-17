import { describe, expect, test } from "bun:test";
import { route } from "../src/router.js";
import {
  fakeReader,
  jpeg,
  ledger,
  MINIMART,
  ORIGIN,
  post,
  signedIn,
} from "./support.js";

// ADR 0025's first step, and specs/129-receipt-photos.md: the Worker answers
// /api/* only, in JSON that's never cached.

function deps() {
  const { reader } = fakeReader({
    ok: true,
    output: MINIMART,
    tokensIn: 1,
    tokensOut: 1,
  });
  const { usage, strikes } = ledger();
  return {
    reader,
    auth: signedIn,
    usage,
    strikes,
    log: () => undefined,
    now: () => 0,
  };
}

describe("the API's routes", () => {
  test("GET /api/health says it's up, and isn't cached", async () => {
    const response = await route(new Request(`${ORIGIN}/api/health`), deps());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("POST /api/receipts/read reads a receipt", async () => {
    expect((await route(post(jpeg()), deps())).status).toBe(200);
  });

  test("anything else is 404, and the wrong method is 405 with what's allowed", async () => {
    const missing = await route(new Request(`${ORIGIN}/api/nothing`), deps());
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "not-found" });

    const wrong = await route(
      new Request(`${ORIGIN}/api/receipts/read`),
      deps(),
    );
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("allow")).toBe("POST");
    const health = await route(
      new Request(`${ORIGIN}/api/health`, { method: "POST" }),
      deps(),
    );
    expect(health.headers.get("allow")).toBe("GET");
  });
});
