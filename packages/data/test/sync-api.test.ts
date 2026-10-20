import { describe, expect, test } from "bun:test";
import {
  ApiError,
  createApi,
  type HouseholdView,
  type Send,
} from "../src/network.js";

// specs/217, the app's side of the household and sync routes, in their
// shape. The session is a cookie the browser sends by itself; no call here
// carries a token.

function network(status: number, body = "") {
  const calls: { url: string; init: RequestInit }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(body, { status }));
  };
  return { send, calls };
}

const bodyOf = (init: RequestInit | undefined) =>
  JSON.parse(typeof init?.body === "string" ? init.body : "null") as unknown;

const RECORD = {
  collection: "plans",
  record: {
    id: "p-1",
    version: 1,
    updatedAt: "x",
    deletedAt: null,
    dish: "dal",
  },
};

describe("the household and sync routes, the API client", () => {
  test("makes a household from records, with the cook's token when the phone held one", async () => {
    const net = network(201, '{"id":"home-1"}');
    const api = createApi({ send: net.send });
    expect(await api.createHousehold([RECORD], "tok")).toEqual({
      id: "home-1",
    });
    expect(net.calls[0]?.url).toBe("/api/household");
    expect(net.calls[0]?.init.method).toBe("POST");
    expect(bodyOf(net.calls[0]?.init)).toEqual({
      records: [RECORD],
      cookToken: "tok",
    });
    const bare = network(201, '{"id":"home-2"}');
    await createApi({ send: bare.send }).createHousehold([]);
    expect(bodyOf(bare.calls[0]?.init)).toEqual({ records: [] });
  });

  test("the household and its members; 404 when there's none", async () => {
    const view: HouseholdView = {
      id: "home-1",
      members: [
        {
          id: "m-1",
          role: "plan",
          kind: "account",
          name: "Mayur",
          stopped: false,
        },
      ],
    };
    const net = network(200, JSON.stringify(view));
    expect(await createApi({ send: net.send }).household()).toEqual(view);
    expect(net.calls[0]?.url).toBe("/api/household");
    const none = network(404, '{"error":"no-household"}');
    const failed = await createApi({ send: none.send })
      .household()
      .catch((e: unknown) => e);
    expect((failed as ApiError).status).toBe(404);
  });

  test("an invite with a role: the code to share and when it runs out", async () => {
    const net = network(201, '{"code":"KM7Q4HTX","expiresAt":"x"}');
    expect(await createApi({ send: net.send }).invite("cook")).toEqual({
      code: "KM7Q4HTX",
      expiresAt: "x",
    });
    expect(net.calls[0]?.url).toBe("/api/household/links");
    expect(bodyOf(net.calls[0]?.init)).toEqual({ role: "cook" });
  });

  test("removes a member, and deletes the account", async () => {
    const net = network(204);
    const api = createApi({ send: net.send });
    await api.removeMember("m-2");
    expect(net.calls[0]?.url).toBe("/api/household/members/m-2");
    expect(net.calls[0]?.init.method).toBe("DELETE");
    await api.deleteAccount();
    expect(net.calls[1]?.url).toBe("/api/account");
    expect(net.calls[1]?.init.method).toBe("DELETE");
  });

  test("pushes records whole, and gets back the ones refused", async () => {
    const net = network(200, JSON.stringify({ refused: [RECORD] }));
    expect(await createApi({ send: net.send }).push([RECORD])).toEqual({
      refused: [RECORD],
    });
    expect(net.calls[0]?.url).toBe("/api/sync/push");
    expect(bodyOf(net.calls[0]?.init)).toEqual({ records: [RECORD] });
  });

  test("pulls the changes after a cursor", async () => {
    const page = {
      changes: [{ seq: 7, collection: "plans", record: RECORD.record }],
      cursor: 7,
      more: false,
      reset: false,
    };
    const net = network(200, JSON.stringify(page));
    expect(await createApi({ send: net.send }).changes(3)).toEqual(page);
    expect(net.calls[0]?.url).toBe("/api/sync/changes?after=3");
    expect(net.calls[0]?.init.method).toBe("GET");
  });
});
