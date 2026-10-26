import type { Received } from "@cookto/messenger";
import {
  agreedRun,
  type InChat,
  readInChat,
  say,
  word,
} from "../receipts/chat.js";
import { runId, startRun } from "../workflows/tomorrow.js";
import type { MessengerDeps } from "./deps.js";
import { withApp } from "./words.js";

// A photo no question was waiting for is a receipt (specs/277): asked once
// per member before it goes to Google, then read. A file gets "photos only,
// for now". Someone with no household is welcomed, as a command is; with
// the bot off, it says so.

type Who = InChat | "stranger" | "off";

async function whoSent(d: MessengerDeps, got: Received): Promise<Who> {
  const c = got.conversation;
  const member = c?.owner.kind === "member" ? c.owner.id : null;
  const who = member && (await d.households.whose(member).catch(() => null));
  if (!member || !who) return "stranger";
  const home = (await d.households.list()).find((h) => h.id === who.household);
  if (!d.workflows || d.workflows.off || home?.botOff) return "off";
  const seed = got.message?.id ?? String(d.now());
  return { d, household: who.household, member, seed };
}

/** Said at once, outside any run: the bot is off, or they're a stranger. */
async function answered(d: MessengerDeps, got: Received, who: Who) {
  if (who === "off" && got.conversation) {
    const text = word(d, "cmd_switched_off");
    await d.messenger.send(got.conversation.id, { kind: "text", text });
    d.after(d.messenger.drain());
    return "receipt-off";
  }
  await d.messenger.channel
    .deliver(got.chat, withApp("welcome"))
    .catch(() => undefined);
  return "receipt-stranger";
}

export async function receiptPhoto(
  d: MessengerDeps,
  got: Received,
  ref: string,
): Promise<string> {
  const c = await whoSent(d, got);
  if (typeof c === "string") return answered(d, got, c);
  if (!d.receipts?.reader) {
    await say(c, "off", word(d, "receipt_not_working"));
    return "receipt-switched-off";
  }
  if (!(await d.workflows?.runs.get(agreedRun(c.member)))) {
    await startRun(d, c.household, runId(`${c.seed}:receipt-ask`), {
      workflow: "receipt_ask",
      audience: c.member,
      about: { ref },
    });
    return "receipt-ask";
  }
  return readInChat(c, ref);
}

export async function receiptFile(
  d: MessengerDeps,
  got: Received,
): Promise<string> {
  const c = await whoSent(d, got);
  if (typeof c === "string") return answered(d, got, c);
  await say(c, "file", word(d, "receipt_file"));
  return "receipt-file";
}
