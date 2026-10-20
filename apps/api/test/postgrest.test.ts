import { describe, expect, test } from "bun:test";
import type { Send } from "../src/network.js";
import { postgrest } from "../src/messenger/postgrest.js";

// ADR 0031, 0032: the Worker reaches the database's functions over HTTPS,
// with the publishable key, and never puts content in an error.

const URL = "https://abcdefghijklmnopqrst.supabase.co";
const KEY = "sb_publishable_madeUpForTheTest";

function network(status: number, body = "") {
  const calls: { url: string; init: RequestInit }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(body, { status }));
  };
  return { send, calls };
}

describe("Postgres over HTTPS", () => {
  test("one POST to rpc, the key in both headers, the arguments as JSON", async () => {
    const net = network(200, '{"id":"c-1"}');
    const call = postgrest({ url: URL, key: KEY, send: net.send });
    const got = await call("msg_conversation_get", {
      p_secret: "s",
      p_id: "c-1",
    });
    expect(got).toEqual({ id: "c-1" });
    expect(net.calls[0]?.url).toBe(`${URL}/rest/v1/rpc/msg_conversation_get`);
    const headers = net.calls[0]?.init.headers as Record<string, string>;
    expect(headers.apikey).toBe(KEY);
    expect(headers.authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(net.calls[0]?.init.body as string)).toEqual({
      p_secret: "s",
      p_id: "c-1",
    });
  });

  test("a function that returns nothing: null; a scalar: the scalar", async () => {
    const call = postgrest({ url: URL, key: KEY, send: network(204).send });
    expect(
      await call("msg_outbox_dequeue", { p_secret: "s", p_message: "m" }),
    ).toBeNull();
    const yes = postgrest({
      url: URL,
      key: KEY,
      send: network(200, "true").send,
    });
    expect(await yes("msg_message_advance", { p_secret: "s" })).toBe(true);
  });

  test("a refusal throws with the function and the status, not the body", async () => {
    const call = postgrest({
      url: URL,
      key: KEY,
      send: network(
        401,
        '{"message":"messenger-secret","hint":"something private"}',
      ).send,
    });
    const error = await call("msg_messages", { p_secret: "s" }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("db msg_messages 401");
  });
});
