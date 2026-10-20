import { describe, expect, test } from "bun:test";
import { createApi, type Send } from "../src/network.js";

// specs/217, the cook's move: a signed-in phone sends to the household's
// cook with its session, which the browser carries as a cookie, so the call
// has no bearer; a phone with its own link still sends its token.

function network(status: number, body = "") {
  const calls: { url: string; init: RequestInit }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(body, { status }));
  };
  return { send, calls };
}

const headersOf = (init: RequestInit | undefined) =>
  (init?.headers ?? {}) as Record<string, string>;

describe("sending with a session", () => {
  test("through the household: no bearer, the session does it; a token still goes as one", async () => {
    const net = network(202, '{"id":"m-1","ids":["m-1"]}');
    const api = createApi({ send: net.send });
    expect(
      await api.sendThroughHousehold({ text: "hi", context: "plan:d" }),
    ).toEqual({ id: "m-1", ids: ["m-1"] });
    expect(net.calls[0]?.url).toBe("/api/messenger/send");
    expect(headersOf(net.calls[0]?.init).authorization).toBeUndefined();
    // The link's own way is still there, with its bearer.
    await api.send("tok", { text: "hi" });
    expect(headersOf(net.calls[1]?.init).authorization).toBe("Bearer tok");
  });
});
