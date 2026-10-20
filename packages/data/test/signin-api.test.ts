import { describe, expect, test } from "bun:test";
import { ApiError, createApi, type Send } from "../src/network.js";

// specs/216, the app's side of sign-in: the four routes in their shape. The
// link's token goes as a bearer; the session is a cookie the browser sends
// by itself, so no call here ever sees it.

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

describe("sign in with Telegram, the API client", () => {
  test("starts a sign-in: POST, no token", async () => {
    const net = network(201, '{"code":"KM7Q4HTX","token":"t","expiresAt":"x"}');
    const api = createApi({ send: net.send, base: "https://cookto.day" });
    expect(await api.startSignIn()).toEqual({
      code: "KM7Q4HTX",
      token: "t",
      expiresAt: "x",
    });
    expect(net.calls[0]?.url).toBe("https://cookto.day/api/auth/links");
    expect(net.calls[0]?.init.method).toBe("POST");
    expect(headersOf(net.calls[0]?.init).authorization).toBeUndefined();
  });

  test("asks whether Start happened, with the token as a bearer", async () => {
    const waiting = network(200, '{"used":false,"state":"waiting"}');
    expect(
      await createApi({ send: waiting.send }).signInStatus("tok", "KM7Q4HTX"),
    ).toEqual({ used: false, state: "waiting" });
    expect(waiting.calls[0]?.url).toBe("/api/auth/links/KM7Q4HTX");
    expect(headersOf(waiting.calls[0]?.init).authorization).toBe("Bearer tok");

    const used = network(200, '{"used":true,"name":"Mayur"}');
    expect(
      await createApi({ send: used.send }).signInStatus("tok", "KM7Q4HTX"),
    ).toEqual({ used: true, name: "Mayur" });
  });

  test("a link that's gone is an error with its status", async () => {
    const net = network(404, '{"error":"gone"}');
    const failed = await createApi({ send: net.send })
      .signInStatus("tok", "KM7Q4HTX")
      .catch((e: unknown) => e);
    expect(failed).toBeInstanceOf(ApiError);
    expect((failed as ApiError).status).toBe(404);
    expect((failed as ApiError).code).toBe("gone");
  });

  test("me: the name, with no token of its own; 401 when signed out", async () => {
    const net = network(200, '{"name":"Mayur"}');
    expect(await createApi({ send: net.send }).me()).toEqual({ name: "Mayur" });
    expect(net.calls[0]?.url).toBe("/api/auth/me");
    expect(net.calls[0]?.init.method).toBe("GET");
    expect(headersOf(net.calls[0]?.init).authorization).toBeUndefined();

    const out = network(401, '{"error":"session"}');
    const failed = await createApi({ send: out.send })
      .me()
      .catch((e: unknown) => e);
    expect((failed as ApiError).status).toBe(401);
  });

  test("sign out: DELETE the session", async () => {
    const net = network(204);
    await createApi({ send: net.send }).signOut();
    expect(net.calls[0]?.url).toBe("/api/auth/session");
    expect(net.calls[0]?.init.method).toBe("DELETE");
  });
});
