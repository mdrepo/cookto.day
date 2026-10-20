import type { Message, Received } from "@cookto/messenger";
import { json, problem } from "../http.js";
import { iso, type MessengerDeps } from "./deps.js";
import { WORDS } from "./words.js";

// POST /api/messenger/telegram (spec #207): what the cook sends. The
// messenger verifies and records; this decides. Four cases: Start with a
// code connects her, or signs the planner in when the code is a sign-in's
// (spec #216); /stop deletes everything; anything else is kept and answered
// with the one line we have. A chat without a conversation gets a plain
// reply through the channel, with nothing kept.

const text = (t: string): Message => ({ kind: "text", text: t });

/** Reply to a chat that has no conversation: sent, not recorded. */
async function tell(d: MessengerDeps, chat: string, t: string): Promise<void> {
  await d.messenger.channel.deliver(chat, text(t)).catch(() => undefined);
}

/** Reply within a conversation: recorded, queued, sent after the answer. */
async function reply(d: MessengerDeps, conversation: string, t: string) {
  await d.messenger.send(conversation, text(t));
  d.after(d.messenger.drain());
}

async function handle(d: MessengerDeps, got: Received): Promise<string> {
  const { event, chat, conversation } = got;
  const now = iso(d.now());
  if (event.kind === "started") {
    if (got.from !== undefined) {
      const name = d.messenger.channel.name;
      const signIn = await d.auth.start(event.code, name, got.from, now);
      if (signIn.ok) {
        await tell(d, chat, WORDS.signedIn);
        return "signed-in";
      }
      if (signIn.reason === "bad") {
        await tell(d, chat, WORDS.badCode);
        return "bad-code";
      }
    }
    const connected = await d.links.connect(
      event.code,
      d.messenger.channel.name,
      chat,
      now,
    );
    if (!connected.ok) {
      await tell(d, chat, WORDS.badCode);
      return "bad-code";
    }
    await reply(d, connected.conversation.id, WORDS.connected);
    return "connected";
  }
  if (event.kind === "stopped") {
    if (conversation === null) return "stranger";
    // The goodbye goes first: deleting the conversation takes its outbox.
    await tell(d, chat, WORDS.stopped);
    if (conversation.owner.kind === "link")
      await d.links.remove(conversation.owner.id);
    else await d.messenger.store.remove(conversation.id);
    return "stopped";
  }
  if (conversation === null) {
    await tell(d, chat, WORDS.cantRead);
    return "stranger";
  }
  await reply(d, conversation.id, WORDS.cantRead);
  return "kept";
}

export async function webhook(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const got = await d.messenger.receive(await request.text(), request.headers);
  const entry = { route: "messenger/telegram", ms: 0 };
  if (got === null) {
    d.log({ ...entry, status: 401, error: "secret", ms: d.now() - started });
    return problem(401, "secret");
  }
  const outcome = got.duplicate ? "duplicate" : await handle(d, got);
  d.log({
    ...entry,
    status: 200,
    kind: got.event.kind,
    outcome,
    ms: d.now() - started,
  });
  return json(200, { ok: true });
}
