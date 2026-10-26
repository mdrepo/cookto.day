import type { Event, Kind, Message } from "./message.js";

// A channel is one messaging service (ADR 0031): Telegram first. The package
// reaches it only through this interface, and only with the network function
// it was handed, so it has no `fetch` of its own.

/** All of `fetch` a channel uses. */
export type Send = (url: string, init: RequestInit) => Promise<Response>;

/** Who sent it: the channel's own id for the person, and their first name. */
export interface Sender {
  id: string;
  name: string;
}

/** One webhook call, understood. */
export interface Parsed {
  /** The channel's own id for the update, to drop one seen twice. */
  updateId: string;
  chat: string;
  event: Event;
  /** Something to acknowledge once handled, when the channel wants that. */
  ack?: string;
  /**
   * Who sent it, when the channel says (spec #216). Handed to the handler
   * beside the event and never written into a message row.
   */
  from?: Sender;
}

/** The channel said no, or didn't answer. `retry` says whether to try again. */
export class ChannelError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
    /** Seconds the channel asked us to wait, if it said. */
    readonly after?: number,
  ) {
    super(message);
    this.name = "ChannelError";
  }
}

export interface Channel {
  readonly name: string;
  supports(kind: Kind): boolean;
  /**
   * Sends one message to one chat and returns the channel's id for it.
   * `edits` is the channel's id of the message an edit changes.
   */
  deliver(
    chat: string,
    message: Message,
    edits?: string,
  ): Promise<{ id: string }>;
  /** Understands a webhook body, or refuses it (wrong secret, not an update). */
  parse(body: string, headers: Headers): Parsed | null;
  /** Tells the channel a button press was handled, if it wants to know. */
  acknowledge?(ack: string): Promise<void>;
  /** The commands one chat's menu shows, when the channel has menus. */
  setCommands?(chat: string, commands: readonly Command[]): Promise<void>;
  /**
   * A file someone sent, by its reference, held in memory only (specs/277):
   * null when it's gone or weighs more than `max` bytes.
   */
  file?(ref: string, max: number): Promise<Uint8Array | null>;
}

/** A command in a chat's menu (specs/270): "today", "Today's plan". */
export interface Command {
  command: string;
  description: string;
}
