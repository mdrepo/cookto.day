import { makeLink } from "../src/messenger/links.js";
import { webhook } from "../src/messenger/webhook.js";
import { ask, type Harness } from "./messenger-support.js";

// The two steps every messenger test starts from (spec #207): a link made
// by the phone, and the cook's Start with its code.

/** A webhook request carrying one of the fake channel's updates. */
export const incoming = (u: { body: string; headers: Headers }) =>
  new Request("https://cookto.day/api/messenger/telegram", {
    method: "POST",
    body: u.body,
    headers: u.headers,
  });

/** A link made and, when asked, connected by the cook from `chat-1`. */
export async function linked(h: Harness, connect = true) {
  const response = await makeLink(ask("POST", "/api/messenger/links"), h.deps);
  const made = (await response.json()) as { code: string; token: string };
  if (connect) {
    const u = h.channel.update({
      id: "u-start",
      chat: "chat-1",
      event: { kind: "started", code: made.code },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    h.channel.deliveries.length = 0;
  }
  return made;
}
