// Text that leaves the app by the person's own hand (specs/103, 195): the
// phone's share sheet when it has one, else the clipboard. Says which.

/** Shares the text with the phone's share sheet, or copies it. */
export async function send(text: string): Promise<"shared" | "copied"> {
  if (typeof navigator.share === "function") {
    await navigator.share({ text });
    return "shared";
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
