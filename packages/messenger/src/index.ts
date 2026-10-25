// The messenger (ADR 0031): sends, receives and records every message
// through one interface, in a store the API provides; Telegram first. No
// network, no database and no domain of its own: both are handed in.
export {
  type Channel,
  ChannelError,
  type Command,
  type Parsed,
  type Send,
  type Sender,
} from "./channel.js";
export { BACKOFF_MINUTES, drain, type Drained, LOCK_MS } from "./drain.js";
export {
  type Delivery,
  FAKE_SECRET_HEADER,
  type FakeChannel,
  type FakeUpdate,
  fakeChannel,
} from "./fake.js";
export { memoryStore } from "./memory-store.js";
export {
  type Button,
  type Event,
  type Kind,
  KINDS,
  type Message,
} from "./message.js";
export {
  createMessenger,
  type Messenger,
  type MessengerOptions,
  type Received,
  type SendOptions,
} from "./messenger.js";
export {
  type Conversation,
  type Due,
  mayAdvance,
  type Owner,
  type Row,
  type Status,
  type Store,
} from "./store.js";
export {
  SECRET_HEADER,
  TELEGRAM_API,
  type Telegram,
  type TelegramOptions,
  telegram,
} from "./telegram.js";
