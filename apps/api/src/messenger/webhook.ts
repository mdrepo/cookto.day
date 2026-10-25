import type { Conversation, Message, Received } from "@cookto/messenger";
import { render } from "@cookto/templates";
import { json, problem } from "../http.js";
import { answered, pressed } from "../workflows/engine.js";
import { iso, type MessengerDeps } from "./deps.js";
import { withApp, WORDS } from "./words.js";

// POST /api/messenger/telegram (spec #207): what the cook sends. The
// messenger verifies and records; this decides. Start with a code signs the
// planner in (spec #216), joins the household by an invite (spec #217), or
// connects the cook to a phone's link; Start with no code opens the app's
// setup in the chat (specs/260); /stop deletes everything. Then the
// router's order (ADR 0034): another command is answered beside any open
// step; a run's button goes to its run; text or a photo goes to her open
// step if it takes it; anything else is kept for the planner and answered
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

/**
 * Start with no code (specs/260): the app's setup, opened in the chat; the
 * app again for a planner with a household; the cook hears she's connected.
 */
async function welcomed(d: MessengerDeps, got: Received): Promise<string> {
  const { chat, conversation } = got;
  const account =
    got.from === undefined
      ? null
      : await d.auth.accountOf(d.messenger.channel.name, got.from.id);
  if (account !== null && (await d.households.get(account)) !== null) {
    await d.messenger.channel
      .deliver(chat, withApp("welcome_back"))
      .catch(() => undefined);
    return "welcome-back";
  }
  if (conversation?.owner.kind === "member") {
    await reply(d, conversation.id, WORDS.connected);
    return "connected-again";
  }
  await d.messenger.channel
    .deliver(chat, withApp("welcome"))
    .catch(() => undefined);
  return "welcome";
}

/** Start with a code: a sign-in's, an invite's, or a cook's link's. */
async function started(
  d: MessengerDeps,
  got: Received,
  code: string,
  now: string,
): Promise<string> {
  const { chat } = got;
  const name = d.messenger.channel.name;
  if (code === "") return welcomed(d, got);
  if (got.from !== undefined) {
    const signIn = await d.auth.start(code, name, got.from, now);
    if (signIn.ok) {
      await tell(d, chat, WORDS.signedIn);
      return "signed-in";
    }
    if (signIn.reason === "bad") {
      await tell(d, chat, WORDS.badCode);
      return "bad-code";
    }
  }
  const invited = await d.households.startInvite(
    code,
    name,
    chat,
    got.from ?? null,
    now,
  );
  if (invited.ok) {
    if (invited.role === "cook") {
      await reply(d, invited.conversation.id, WORDS.connected);
      return "joined-cook";
    }
    await tell(d, chat, WORDS.joined);
    return "joined";
  }
  if (invited.reason === "bad") {
    await tell(d, chat, WORDS.badCode);
    return "bad-code";
  }
  const connected = await d.links.connect(code, name, chat, now);
  if (!connected.ok) {
    await tell(d, chat, WORDS.badCode);
    return "bad-code";
  }
  await reply(d, connected.conversation.id, WORDS.connected);
  return "connected";
}

/** A run's button, her text or her photo, to the engine: null if not taken. */
async function toRuns(
  d: MessengerDeps,
  conversation: Conversation,
  event: Received["event"],
): Promise<string | null> {
  if (event.kind === "button") {
    const press = await pressed(d, conversation, event.value);
    if (press === null) return null;
    if (press.doneAlready && d.workflows) {
      const done = render(d.workflows.templates, "en", "done_already");
      await reply(d, conversation.id, done.text);
    }
    return `run-${press.result}`;
  }
  if (event.kind !== "text" && event.kind !== "photo") return null;
  if (event.kind === "text" && event.text.startsWith("/")) return null;
  const answer = await answered(
    d,
    conversation,
    event.kind === "text" ? event : { kind: "photo", ref: event.ref },
  );
  return answer === null ? null : `run-${answer}`;
}

async function handle(d: MessengerDeps, got: Received): Promise<string> {
  const { event, chat, conversation } = got;
  const now = iso(d.now());
  if (event.kind === "started") return started(d, got, event.code, now);
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
  // The cook's name, from her tap or her words (specs/270); a planner's
  // comes from their sign-in, and before migration 0011 there's nowhere.
  if (conversation.owner.kind === "member" && got.from)
    await d.households
      .nameCook(conversation.owner.id, got.from.name)
      .catch(() => undefined);
  const run = await toRuns(d, conversation, event);
  if (run !== null) return run;
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
