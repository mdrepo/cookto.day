import { describe, expect, test } from "bun:test";
import { gemini, INSTRUCTION } from "../src/receipts/gemini.js";
import { jpeg, MINIMART } from "./support.js";

// specs/129-receipt-photos.md, rules 3, 5 and 6, at the AI's edge: Google
// gets our fixed instruction and the photo, nothing else, and every way it
// can fail has one meaning.

const MODEL = "gemini-2.5-flash-lite";
const photo = { bytes: jpeg(64), type: "image/jpeg" as const };

/** Google's answer: the JSON text, why it stopped, and the tokens used. */
function answer(text: string, finishReason = "STOP"): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text }] }, finishReason }],
    usageMetadata: { promptTokenCount: 291, candidatesTokenCount: 595 },
  });
}

/** A fake fetch that answers once, and keeps the request it was sent. */
function google(reply: (signal?: AbortSignal | null) => Promise<Response>) {
  const sent: Request[] = [];
  const send = (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(new Request(input, init));
    return reply(init?.signal);
  };
  return { send, sent };
}

/** Google never answering: like fetch, it gives up when the signal says. */
const silence = (signal?: AbortSignal | null) =>
  new Promise<Response>((_, reject) => {
    signal?.addEventListener("abort", () => {
      reject(new DOMException("timed out", "TimeoutError"));
    });
  });

describe("reading a photo with Gemini", () => {
  test("sends only our instruction and the photo, with the key in a header, and limits the answer", async () => {
    const { send, sent } = google(() =>
      Promise.resolve(answer(JSON.stringify(MINIMART))),
    );
    const read = await gemini({ key: "key-1", model: MODEL, send }).read(photo);
    expect(read).toEqual({
      ok: true,
      output: MINIMART,
      tokensIn: 291,
      tokensOut: 595,
    });

    const request = sent[0];
    if (!request) throw new Error("nothing was sent");
    expect(request.method).toBe("POST");
    expect(request.url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    );
    expect(request.headers.get("x-goog-api-key")).toBe("key-1");
    const body = (await request.json()) as Record<string, unknown>;
    expect(body["systemInstruction"]).toEqual({
      parts: [{ text: INSTRUCTION }],
    });
    expect(body["contents"]).toEqual([
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: Buffer.from(photo.bytes).toString("base64"),
            },
          },
        ],
      },
    ]);
    expect(body["generationConfig"]).toMatchObject({
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        required: ["lines"],
        properties: {
          lines: { items: { required: ["name", "qty", "amount"] } },
        },
      },
    });
    expect(Object.keys(body).sort()).toEqual([
      "contents",
      "generationConfig",
      "systemInstruction",
    ]);
  });

  test("Google refusing, failing, busy, unreachable or too slow is 'unavailable'", async () => {
    const replies: ((signal?: AbortSignal | null) => Promise<Response>)[] = [
      () => Promise.resolve(new Response("bad request", { status: 400 })),
      () => Promise.resolve(new Response("bad key", { status: 403 })),
      () => Promise.resolve(new Response("busy", { status: 429 })),
      () => Promise.resolve(new Response("down", { status: 500 })),
      () => Promise.reject(new TypeError("network")),
      silence,
    ];
    for (const reply of replies) {
      const { send } = google(reply);
      const reader = gemini({ key: "k", model: MODEL, send, timeoutMs: 20 });
      expect(await reader.read(photo)).toEqual({
        ok: false,
        reason: "unavailable",
      });
    }
  });

  test("an answer cut short, blocked or not JSON is 'unreadable', and its tokens still count", async () => {
    const replies = [
      answer('{"lines": [', "MAX_TOKENS"),
      answer("", "SAFETY"),
      answer("Here is a poem about rice."),
    ];
    const results = [];
    for (const reply of replies) {
      const { send } = google(() => Promise.resolve(reply));
      results.push(await gemini({ key: "k", model: MODEL, send }).read(photo));
    }
    expect(results.map((r) => (r.ok ? "ok" : r.reason))).toEqual([
      "unreadable",
      "unreadable",
      "unreadable",
    ]);
    expect(results[0]).toEqual({
      ok: false,
      reason: "unreadable",
      tokensIn: 291,
      tokensOut: 595,
    });
  });
});
