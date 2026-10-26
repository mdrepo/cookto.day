import { describe, expect, test } from "bun:test";
import type { Send } from "../src/channel.js";
import { fakeChannel } from "../src/fake.js";
import { SECRET_HEADER, telegram } from "../src/telegram.js";

// specs/277-receipt-photo-in-telegram.md, criteria 8 and 9, at Telegram's
// edge: the largest photo size that's at most 1.5 MB, a file (a document)
// as an event of its own, and a photo fetched by its reference, held in
// memory only and never past the cap. The token is made up.

const TOKEN = "123456:made-up-token";
const SECRET = "made-up-secret";
const MAX = 1_500_000;

const parse = (inner: object) =>
  telegram({
    token: TOKEN,
    secret: SECRET,
    send: () => Promise.reject(),
  }).parse(
    JSON.stringify({ update_id: 30, ...inner }),
    new Headers({ [SECRET_HEADER]: SECRET }),
  )?.event;
const sent = (more: object) => ({
  message: { message_id: 12, chat: { id: 123 }, ...more },
});

/** Telegram answering getFile, then the file's bytes. */
function files(path: string, size: number, bytes = new Uint8Array(size)) {
  const calls: { url: string; body: string }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, body: typeof init.body === "string" ? init.body : "" });
    if (url.endsWith("/getFile"))
      return Promise.resolve(
        Response.json({
          ok: true,
          result: { file_id: "ref-1", file_path: path, file_size: size },
        }),
      );
    return Promise.resolve(new Response(bytes));
  };
  return { send, calls };
}

describe("a photo's size (8)", () => {
  test("the largest size Telegram has that's at most 1.5 MB", () => {
    expect(
      parse(
        sent({
          photo: [
            { file_id: "s", file_size: 20_000 },
            { file_id: "m", file_size: 900_000 },
            { file_id: "l", file_size: 1_600_000 },
          ],
        }),
      ),
    ).toEqual({ kind: "photo", ref: "m", caption: null });
  });

  test("every size over 1.5 MB: the smallest, which the fetch then refuses", () => {
    expect(
      parse(
        sent({
          photo: [
            { file_id: "l", file_size: 1_600_000 },
            { file_id: "xl", file_size: 3_000_000 },
          ],
        }),
      ),
    ).toEqual({ kind: "photo", ref: "l", caption: null });
  });
});

describe("a file sent to the bot (9)", () => {
  test("a document is a file, with its name, never read", () => {
    expect(
      parse(
        sent({
          document: { file_id: "d", file_name: "invoice.pdf" },
          caption: "bill",
        }),
      ),
    ).toEqual({ kind: "file", name: "invoice.pdf" });
  });
});

describe("fetching a photo (8)", () => {
  test("getFile, then the file from Telegram's file address, with the token only in the URL", async () => {
    const net = files("photos/file_1.jpg", 2_000);
    const bytes = await telegram({
      token: TOKEN,
      secret: SECRET,
      send: net.send,
    }).file?.("ref-1", MAX);
    expect(bytes?.byteLength).toBe(2_000);
    expect(net.calls.map((c) => c.url)).toEqual([
      `https://api.telegram.org/bot${TOKEN}/getFile`,
      `https://api.telegram.org/file/bot${TOKEN}/photos/file_1.jpg`,
    ]);
    expect(JSON.parse(net.calls[0]?.body ?? "")).toEqual({ file_id: "ref-1" });
  });

  test("over the cap: nothing is fetched past getFile", async () => {
    const net = files("photos/big.jpg", MAX + 1);
    const file = telegram({
      token: TOKEN,
      secret: SECRET,
      send: net.send,
    }).file;
    expect(await file?.("ref-1", MAX)).toBeNull();
    expect(net.calls).toHaveLength(1);
  });

  test("a file bigger than Telegram said is still refused", async () => {
    const net = files("photos/lie.jpg", 1_000, new Uint8Array(MAX + 1));
    const file = telegram({
      token: TOKEN,
      secret: SECRET,
      send: net.send,
    }).file;
    expect(await file?.("ref-1", MAX)).toBeNull();
  });

  test("the fake channel hands back the files a test gave it", async () => {
    const channel = fakeChannel();
    channel.files.set("ref-1", new Uint8Array(10));
    expect((await channel.file?.("ref-1", MAX))?.byteLength).toBe(10);
    expect(await channel.file?.("ref-1", 5)).toBeNull();
    expect(await channel.file?.("other", MAX)).toBeNull();
  });
});
