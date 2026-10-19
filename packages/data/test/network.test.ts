import { describe, expect, test } from "bun:test";
import { ApiError, createApi, type Send } from "../src/network.js";

// ADR 0024, 0025 and specs/207: the app's one way to the network, our own
// API. Each route in its shape, the token in a header, and an error that is
// a status and a code, never a body.

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

describe("the API client", () => {
  test("makes a link: POST, no token", async () => {
    const net = network(201, '{"code":"KM7Q4HTX","token":"t","expiresAt":"x"}');
    const api = createApi({ send: net.send, base: "https://cookto.day" });
    expect(await api.makeLink()).toEqual({
      code: "KM7Q4HTX",
      token: "t",
      expiresAt: "x",
    });
    expect(net.calls[0]?.url).toBe("https://cookto.day/api/messenger/links");
    expect(net.calls[0]?.init.method).toBe("POST");
    expect(headersOf(net.calls[0]?.init).authorization).toBeUndefined();
  });

  test("asks whether the cook connected, with the token as a bearer", async () => {
    const net = network(200, '{"state":"connected"}');
    const api = createApi({ send: net.send });
    expect(await api.linkState("tok", "KM7Q4HTX")).toBe("connected");
    expect(net.calls[0]?.url).toBe("/api/messenger/links/KM7Q4HTX");
    expect(headersOf(net.calls[0]?.init).authorization).toBe("Bearer tok");
  });

  test("sends, now or later, as JSON", async () => {
    const net = network(202, '{"id":"m-1"}');
    const api = createApi({ send: net.send });
    expect(
      await api.send("tok", {
        text: "hi",
        at: "2026-10-20T13:00:00.000Z",
        context: "plan:d",
      }),
    ).toEqual({ id: "m-1" });
    expect(net.calls[0]?.url).toBe("/api/messenger/send");
    expect(JSON.parse(net.calls[0]?.init.body as string)).toEqual({
      text: "hi",
      at: "2026-10-20T13:00:00.000Z",
      context: "plan:d",
    });
    expect(headersOf(net.calls[0]?.init)["content-type"]).toBe(
      "application/json",
    );
  });

  test("cancels and unlinks with DELETE, and takes an empty answer", async () => {
    const net = network(204);
    const api = createApi({ send: net.send });
    await api.cancel("tok", "m-1");
    await api.unlink("tok");
    expect(net.calls.map((c) => [c.init.method, c.url])).toEqual([
      ["DELETE", "/api/messenger/send/m-1"],
      ["DELETE", "/api/messenger/links"],
    ]);
  });

  test("a refusal is a status and a code; no network is status 0", async () => {
    const api = createApi({
      send: network(404, '{"error":"gone","hint":"private"}').send,
    });
    const refused = await api
      .send("tok", { text: "x" })
      .catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(ApiError);
    expect(refused).toMatchObject({ status: 404, code: "gone" });
    expect((refused as Error).message).not.toContain("private");
    const dead = createApi({
      send: () => Promise.reject(new TypeError("offline")),
    });
    const failed = await dead.makeLink().catch((e: unknown) => e);
    expect(failed).toMatchObject({ status: 0, code: "network" });
  });

  test("every call has a 15-second limit", async () => {
    let signal: AbortSignal | null | undefined;
    const api = createApi({
      send: (_, init) => {
        signal = init.signal;
        return Promise.resolve(new Response("{}", { status: 200 }));
      },
    });
    await api.makeLink();
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
