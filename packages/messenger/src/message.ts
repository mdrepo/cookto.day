// What the messenger sends (ADR 0031): one of a few kinds, open to more. A
// kind is added when a spec first sends it; the first four are text, photo,
// buttons and an edit of a message already sent.

/** A button under a message: a value that comes back when pressed, or a link. */
export type Button =
  { label: string; value: string } | { label: string; url: string };

export type Message =
  | { kind: "text"; text: string }
  | {
      kind: "photo";
      /** A link, or the channel's own reference to a file it already has. */
      photo: string;
      caption?: string;
    }
  | { kind: "buttons"; text: string; buttons: Button[][] }
  | {
      kind: "edit";
      /** Our id of the message to change. */
      of: string;
      text?: string;
      buttons?: Button[][];
    };

export type Kind = Message["kind"];

export const KINDS: readonly Kind[] = ["text", "photo", "buttons", "edit"];

/** What came in (ADR 0031): one event, the same for every channel. */
export type Event =
  | { kind: "started"; code: string }
  | { kind: "stopped" }
  | { kind: "text"; text: string }
  | {
      kind: "button";
      value: string;
      /** The channel's id of the message whose button was pressed. */
      answers: string | null;
    }
  | {
      kind: "photo";
      /** The channel's reference to the file, never the file. */
      ref: string;
      caption: string | null;
    };
