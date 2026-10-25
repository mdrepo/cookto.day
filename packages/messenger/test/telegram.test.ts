import { describe, expect, test } from "bun:test";
import { ChannelError, type Send } from "../src/channel.js";
import { SECRET_HEADER, telegram } from "../src/telegram.js";
import { channelContract, fakeNetwork } from "./contract.js";

// specs/207, criterion 17, for Telegram: the Bot API's shapes, and only
// here. The token is made up.

const TOKEN = "123456:made-up-token";
const SECRET = "made-up-secret";
const make = (send: Send) => telegram({ token: TOKEN, secret: SECRET, send });

const headers = (secret = SECRET) => new Headers({ [SECRET_HEADER]: secret });
const update = (id: number, inner: object) => ({
  body: JSON.stringify({ update_id: id, ...inner }),
  headers: headers(),
});
const message = (text: string, more: object = {}) => ({
  message: { message_id: 10, chat: { id: 123 }, text, ...more },
});

channelContract(
  "Telegram",
  () => {
    const net = fakeNetwork();
    return {
      channel: make(net.send),
      sent: () => net.calls.map((c) => c.body),
    };
  },
  {
    started: (code) => update(1, message(`/start ${code}`)),
    stopped: () => update(2, message("/stop")),
    text: (text) => update(3, message(text)),
    photo: (ref) =>
      update(4, {
        message: {
          message_id: 11,
          chat: { id: 123 },
          photo: [{ file_id: "small" }, { file_id: ref }],
        },
      }),
    button: (value, answers) =>
      update(5, {
        callback_query: {
          id: "cq-1",
          data: value,
          message: { message_id: Number(answers), chat: { id: 123 } },
        },
      }),
    wrongSecret: () => ({
      body: JSON.stringify({ update_id: 6, ...message("hi") }),
      headers: headers("other"),
    }),
  },
);

describe("Telegram's own shapes", () => {
  test("the token is in the URL and nowhere else; text goes to sendMessage", async () => {
    const net = fakeNetwork();
    await make(net.send).deliver("123", { kind: "text", text: "hi" });
    expect(net.calls[0]?.url).toBe(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    );
    expect(net.calls[0]?.body).not.toContain(TOKEN);
    expect(JSON.parse(net.calls[0]?.body ?? "")).toEqual({
      chat_id: "123",
      text: "hi",
    });
  });

  test("buttons are an inline keyboard, rows kept", async () => {
    const net = fakeNetwork();
    await make(net.send).deliver("123", {
      kind: "buttons",
      text: "Tomorrow",
      buttons: [
        [
          { label: "Got it", value: "ok" },
          { label: "Open", url: "https://cookto.day/" },
        ],
        [{ label: "Swap", value: "swap" }],
      ],
    });
    const body = JSON.parse(net.calls[0]?.body ?? "") as {
      reply_markup: { inline_keyboard: unknown[][] };
    };
    expect(body.reply_markup.inline_keyboard).toEqual([
      [
        { text: "Got it", callback_data: "ok" },
        { text: "Open", url: "https://cookto.day/" },
      ],
      [{ text: "Swap", callback_data: "swap" }],
    ]);
  });

  test("an edit without text changes only the buttons", async () => {
    const net = fakeNetwork({ ok: true, result: true });
    const { id } = await make(net.send).deliver(
      "123",
      { kind: "edit", of: "m-1", buttons: [] },
      "77",
    );
    expect(net.calls[0]?.url).toContain("editMessageReplyMarkup");
    expect(id).toBe("77");
  });

  test("the message id comes back as the channel's id", async () => {
    const net = fakeNetwork({ ok: true, result: { message_id: 4242 } });
    const { id } = await make(net.send).deliver("123", {
      kind: "text",
      text: "hi",
    });
    expect(id).toBe("4242");
  });

  test.each([
    [
      429,
      {
        ok: false,
        description: "Too Many Requests",
        parameters: { retry_after: 7 },
      },
      true,
      7,
    ],
    [502, { ok: false, description: "Bad Gateway" }, true, undefined],
    [
      403,
      { ok: false, description: "Forbidden: bot was blocked by the user" },
      false,
      undefined,
    ],
    [
      400,
      { ok: false, description: "Bad Request: chat not found" },
      false,
      undefined,
    ],
  ])("a %i answer: retry %p", async (status, answer, retry, after) => {
    const send: Send = () =>
      Promise.resolve(new Response(JSON.stringify(answer), { status }));
    const error = await make(send)
      .deliver("123", { kind: "text", text: "hi" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChannelError);
    expect((error as ChannelError).retry).toBe(retry);
    expect((error as ChannelError).after).toBe(after);
    expect((error as ChannelError).message).not.toContain(TOKEN);
  });

  test("no answer at all: retry", async () => {
    const send: Send = () => Promise.reject(new Error("socket hang up"));
    const error = await make(send)
      .deliver("123", { kind: "text", text: "hi" })
      .catch((e: unknown) => e);
    expect((error as ChannelError).retry).toBe(true);
  });

  test("a button press is acknowledged by its query id", async () => {
    const net = fakeNetwork({ ok: true, result: true });
    const channel = make(net.send);
    const parsed = channel.parse(
      ...(Object.values(
        update(5, {
          callback_query: {
            id: "cq-9",
            data: "ok",
            message: { message_id: 1, chat: { id: 123 } },
          },
        }),
      ) as [string, Headers]),
    );
    await channel.acknowledge?.(parsed?.ack ?? "");
    expect(net.calls[0]?.url).toContain("answerCallbackQuery");
    expect(net.calls[0]?.body).toContain("cq-9");
  });

  test("/start alone is started with an empty code; a sticker is empty text", () => {
    const channel = make(fakeNetwork().send);
    const a = channel.parse(
      ...(Object.values(update(7, message("/start"))) as [string, Headers]),
    );
    expect(a?.event).toEqual({ kind: "started", code: "" });
    const b = channel.parse(
      ...(Object.values(
        update(8, {
          message: { message_id: 12, chat: { id: 123 }, sticker: {} },
        }),
      ) as [string, Headers]),
    );
    expect(b?.event).toEqual({ kind: "text", text: "" });
  });

  test("not an update: refused", () => {
    const channel = make(fakeNetwork().send);
    expect(channel.parse("not json", headers())).toBeNull();
    expect(
      channel.parse(JSON.stringify({ update_id: 9 }), headers()),
    ).toBeNull();
  });

  test("installs the webhook once, and keeps it after", async () => {
    const url = "https://cookto.day/api/messenger/telegram";
    const missing = fakeNetwork({ ok: true, result: { url: "" } });
    expect(await make(missing.send).installWebhook(url)).toBe("set");
    expect(missing.calls.map((c) => c.url.split("/").pop())).toEqual([
      "getWebhookInfo",
      "setWebhook",
    ]);
    const body = JSON.parse(missing.calls[1]?.body ?? "") as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({ url, secret_token: SECRET });
    const present = fakeNetwork({ ok: true, result: { url } });
    expect(await make(present.send).installWebhook(url)).toBe("kept");
    expect(present.calls).toHaveLength(1);
  });
});

describe("one sentence, one message (specs/270)", () => {
  test("a silent message arrives without a sound; the others still ring", async () => {
    const net = fakeNetwork();
    const channel = make(net.send);
    await channel.deliver("123", { kind: "text", text: "Hi", silent: true });
    await channel.deliver("123", {
      kind: "buttons",
      text: "Shall I send it?",
      buttons: [[{ label: "Send it", value: "s" }]],
      silent: true,
    });
    await channel.deliver("123", { kind: "text", text: "Loud" });
    const bodies = net.calls.map(
      (c) => JSON.parse(c.body) as Record<string, unknown>,
    );
    expect(bodies[0]).toEqual({
      chat_id: "123",
      text: "Hi",
      disable_notification: true,
    });
    expect(bodies[1]).toMatchObject({ disable_notification: true });
    expect(bodies[2]).not.toHaveProperty("disable_notification");
  });
});

describe("commands (specs/270)", () => {
  test("a typed command is a command, with or without the bot's name", () => {
    const channel = make(fakeNetwork().send);
    const of = (id: number, text: string) =>
      channel.parse(
        ...(Object.values(update(id, message(text))) as [string, Headers]),
      )?.event;
    expect(of(20, "/today")).toEqual({ kind: "command", name: "today" });
    expect(of(21, "/Tomorrow@cookto_day_bot")).toEqual({
      kind: "command",
      name: "tomorrow",
    });
    expect(of(22, "/stop")).toEqual({ kind: "stopped" });
    expect(of(23, "no slash")).toEqual({ kind: "text", text: "no slash" });
  });

  test("a chat's menu is its own: setMyCommands for that chat", async () => {
    const net = fakeNetwork({ ok: true, result: true });
    await make(net.send).setCommands?.("123", [
      { command: "today", description: "Today's plan" },
    ]);
    expect(net.calls[0]?.url.split("/").pop()).toBe("setMyCommands");
    expect(JSON.parse(net.calls[0]?.body ?? "")).toEqual({
      commands: [{ command: "today", description: "Today's plan" }],
      scope: { type: "chat", chat_id: "123" },
    });
  });
});
