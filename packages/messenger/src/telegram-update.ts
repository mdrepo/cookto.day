import type { Parsed } from "./channel.js";
import type { Event } from "./message.js";

// One Telegram update, turned into the package's one event (ADR 0031). Only
// the fields we read are typed; everything else in an update is ignored.

interface Chat {
  id: number;
}

interface From {
  id: number;
  first_name: string;
}

interface IncomingMessage {
  message_id: number;
  chat: Chat;
  from?: From;
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size?: number }[];
  document?: { file_id: string; file_name?: string };
}

/** The most a photo may weigh to be read (specs/129, rule 3). */
const MAX_PHOTO = 1_500_000;

interface CallbackQuery {
  id: string;
  data?: string;
  message?: IncomingMessage;
}

interface Update {
  update_id: number;
  message?: IncomingMessage;
  callback_query?: CallbackQuery;
}

/**
 * "/start CODE" and "/stop", as Telegram delivers a tapped link or command;
 * any other "/word", from the menu or typed, as a command (specs/270).
 */
function command(text: string): Event | null {
  const [word = "", ...rest] = text.trim().split(/\s+/);
  if (word === "/start") return { kind: "started", code: rest.join(" ") };
  if (word === "/stop") return { kind: "stopped" };
  const name = /^\/([A-Za-z_]+)(?:@\w+)?$/.exec(word)?.[1];
  return name ? { kind: "command", name: name.toLowerCase() } : null;
}

function ofMessage(m: IncomingMessage): Event {
  if (m.photo && m.photo.length > 0) {
    // Telegram lists sizes small to large: the largest that can be read
    // (specs/277), or the smallest, which the fetch then refuses.
    const fits = m.photo.filter((p) => (p.file_size ?? 0) <= MAX_PHOTO);
    const ref = (fits.at(-1) ?? m.photo[0])?.file_id ?? "";
    return { kind: "photo", ref, caption: m.caption ?? null };
  }
  if (m.document) return { kind: "file", name: m.document.file_name ?? null };
  const text = m.text ?? "";
  return command(text) ?? { kind: "text", text };
}

export function parseUpdate(body: string): Parsed | null {
  let u: Update;
  try {
    u = JSON.parse(body) as Update;
  } catch {
    return null;
  }
  if (typeof u !== "object" || typeof u.update_id !== "number") return null;
  const updateId = String(u.update_id);
  if (u.callback_query?.message) {
    const q = u.callback_query;
    return {
      updateId,
      chat: String(q.message?.chat.id),
      event: {
        kind: "button",
        value: q.data ?? "",
        answers: q.message ? String(q.message.message_id) : null,
      },
      ack: q.id,
    };
  }
  if (u.message) {
    const { from } = u.message;
    return {
      updateId,
      chat: String(u.message.chat.id),
      event: ofMessage(u.message),
      ...(from && { from: { id: String(from.id), name: from.first_name } }),
    };
  }
  return null;
}
