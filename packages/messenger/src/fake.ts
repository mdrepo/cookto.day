import {
  type Channel,
  ChannelError,
  type Command,
  type Parsed,
  type Sender,
} from "./channel.js";
import type { Event, Kind, Message } from "./message.js";

// A channel that records what it was asked to send and takes incoming
// events as plain JSON (ADR 0031): for the API's tests and the app's browser
// fakes, so nobody writes their own.

export const FAKE_SECRET_HEADER = "x-fake-secret";

export interface Delivery {
  chat: string;
  message: Message;
  edits: string | undefined;
}

/** An incoming event, as the fake's webhook body. */
export interface FakeUpdate {
  id: string;
  chat: string;
  event: Event;
  ack?: string;
  from?: Sender;
}

export interface FakeChannel extends Channel {
  readonly deliveries: Delivery[];
  readonly acknowledged: string[];
  /** Each chat's menu, as last set (specs/270). */
  readonly menus: Map<string, readonly Command[]>;
  /** The next deliveries fail with this, once each. */
  fail(...errors: ChannelError[]): void;
  /** A webhook body and headers for this event, the way the fake wants them. */
  update(u: FakeUpdate): { body: string; headers: Headers };
}

export function fakeChannel(
  secret = "fake-secret",
  supported: readonly Kind[] = ["text", "photo", "buttons", "edit"],
): FakeChannel {
  const deliveries: Delivery[] = [];
  const acknowledged: string[] = [];
  const menus = new Map<string, readonly Command[]>();
  const failures: ChannelError[] = [];
  let next = 0;
  return {
    name: "fake",
    deliveries,
    acknowledged,
    menus,
    setCommands(chat, commands) {
      menus.set(chat, commands);
      return Promise.resolve();
    },
    supports: (kind) => supported.includes(kind),
    deliver(chat, message, edits) {
      const failure = failures.shift();
      if (failure) return Promise.reject(failure);
      deliveries.push({ chat, message, edits });
      return Promise.resolve({ id: `f-${String(++next)}` });
    },
    parse(body, headers): Parsed | null {
      if (headers.get(FAKE_SECRET_HEADER) !== secret) return null;
      try {
        const u = JSON.parse(body) as FakeUpdate;
        return {
          updateId: u.id,
          chat: u.chat,
          event: u.event,
          ...(u.ack !== undefined && { ack: u.ack }),
          ...(u.from !== undefined && { from: u.from }),
        };
      } catch {
        return null;
      }
    },
    acknowledge(ack) {
      acknowledged.push(ack);
      return Promise.resolve();
    },
    fail: (...errors) => {
      failures.push(...errors);
    },
    update: (u) => ({
      body: JSON.stringify(u),
      headers: new Headers({ [FAKE_SECRET_HEADER]: secret }),
    }),
  };
}
