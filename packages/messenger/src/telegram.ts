import {
  type Channel,
  ChannelError,
  type Parsed,
  type Send,
} from "./channel.js";
import type { Button, Kind, Message } from "./message.js";
import { parseUpdate } from "./telegram-update.js";

// Telegram, the first channel (ADR 0031): the only file that knows the Bot
// API's shapes for sending. Updates come in through telegram-update.ts.
// The token travels only in the URL Telegram defines, and only here.

export const TELEGRAM_API = "https://api.telegram.org";
export const SECRET_HEADER = "x-telegram-bot-api-secret-token";

export interface TelegramOptions {
  token: string;
  /** What Telegram must send with every update (secret_token). */
  secret: string;
  send: Send;
  api?: string;
  timeoutMs?: number;
}

const KINDS: readonly Kind[] = ["text", "photo", "buttons", "edit"];

type Keyboard = {
  inline_keyboard: Record<string, string | { url: string }>[][];
};

const keyboard = (rows: Button[][] | undefined): Keyboard | undefined =>
  rows && {
    inline_keyboard: rows.map((row) =>
      row.map((b) =>
        "url" in b
          ? { text: b.label, url: b.url }
          : "app" in b
            ? { text: b.label, web_app: { url: b.app } }
            : { text: b.label, callback_data: b.value },
      ),
    ),
  };

/** The Bot API method and body for one message. */
function call(
  chat: string,
  m: Message,
  edits: string | undefined,
): [string, Record<string, unknown>] {
  const chat_id = chat;
  switch (m.kind) {
    case "text":
      return ["sendMessage", { chat_id, text: m.text }];
    case "buttons":
      return [
        "sendMessage",
        { chat_id, text: m.text, reply_markup: keyboard(m.buttons) },
      ];
    case "photo":
      return [
        "sendPhoto",
        { chat_id, photo: m.photo, ...(m.caption && { caption: m.caption }) },
      ];
    case "edit": {
      const base = { chat_id, message_id: edits };
      if (m.text !== undefined)
        return [
          "editMessageText",
          { ...base, text: m.text, reply_markup: keyboard(m.buttons) },
        ];
      return [
        "editMessageReplyMarkup",
        { ...base, reply_markup: keyboard(m.buttons) },
      ];
    }
  }
}

export interface Telegram extends Channel {
  /** Tells Telegram where to send updates, if it isn't already (spec #207). */
  installWebhook(url: string): Promise<"set" | "kept">;
}

export function telegram(o: TelegramOptions): Telegram {
  const api = o.api ?? TELEGRAM_API;
  const timeout = o.timeoutMs ?? 10_000;

  async function post(
    method: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await o.send(`${api}/bot${o.token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new ChannelError("unreachable", true);
    }
    const answer = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: unknown;
      description?: string;
      parameters?: { retry_after?: number };
    };
    if (response.ok && answer.ok) return answer.result;
    const why = `${String(response.status)} ${answer.description ?? ""}`.trim();
    if (response.status === 429)
      throw new ChannelError(why, true, answer.parameters?.retry_after);
    throw new ChannelError(why, response.status >= 500);
  }

  return {
    name: "telegram",
    supports: (kind) => KINDS.includes(kind),
    async deliver(chat, message, edits) {
      if (message.kind === "edit" && edits === undefined)
        throw new ChannelError("edit-of-unsent", false);
      const [method, body] = call(chat, message, edits);
      const result = await post(method, body);
      const id =
        typeof result === "object" && result !== null && "message_id" in result
          ? String((result as { message_id: number }).message_id)
          : edits;
      if (id === undefined) throw new ChannelError("no-message-id", false);
      return { id };
    },
    parse(body, headers): Parsed | null {
      if (headers.get(SECRET_HEADER) !== o.secret) return null;
      return parseUpdate(body);
    },
    async acknowledge(ack) {
      await post("answerCallbackQuery", { callback_query_id: ack }).catch(
        () => undefined,
      );
    },
    async installWebhook(url) {
      const info = (await post("getWebhookInfo", {})) as { url?: string };
      if (info.url === url) return "kept";
      await post("setWebhook", {
        url,
        secret_token: o.secret,
        allowed_updates: ["message", "callback_query"],
      });
      return "set";
    },
  };
}
