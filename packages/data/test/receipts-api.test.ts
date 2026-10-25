import { describe, expect, test } from "bun:test";
import { ApiError, createApi, type Send } from "../src/network.js";

// specs/129, the app's side: a receipt photo goes to our API as the photo
// itself, never as JSON, and the answer is the checked lines. A refusal is a
// status and a code, and for a limit, which limit it was.

function network(status: number, body = "") {
  const calls: { url: string; init: RequestInit }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(body, { status }));
  };
  return { send, calls };
}

const RECEIPT = {
  shop: "Corner Store",
  date: "2026-10-24",
  lines: [{ name: "Fresh Paneer 200G", qty: 4, amount: 12, check: false }],
};

describe("reading a receipt photo, the API client", () => {
  test("POSTs the photo as it is, with its type, and gets the lines", async () => {
    const net = network(200, JSON.stringify(RECEIPT));
    const api = createApi({ send: net.send, base: "https://cookto.day" });
    const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    });
    expect(await api.readReceipt(photo)).toEqual(RECEIPT);
    expect(net.calls[0]?.url).toBe("https://cookto.day/api/receipts/read");
    expect(net.calls[0]?.init.method).toBe("POST");
    expect(net.calls[0]?.init.body).toBe(photo);
    const headers = net.calls[0]?.init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("image/jpeg");
  });

  test("a limit says which; other refusals are a status and a code", async () => {
    const limited = network(
      429,
      '{"error":"limit","limit":"household-month","resetsAt":"2026-11-01T00:00:00Z"}',
    );
    const photo = new Blob(["x"], { type: "image/jpeg" });
    const error = await createApi({ send: limited.send })
      .readReceipt(photo)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 429,
      code: "limit",
      detail: "household-month",
    });
    const rejected = network(422, '{"error":"not-a-receipt"}');
    expect(
      await createApi({ send: rejected.send })
        .readReceipt(photo)
        .catch((e: unknown) => e),
    ).toMatchObject({ status: 422, code: "not-a-receipt" });
  });
});
