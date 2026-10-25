// Telegram's own window, around a page the bot opened (specs/241, 260). The
// page talks to it with Telegram's events, without Telegram's script, so
// the Content-Security-Policy stays as it is: on a phone through the
// object Telegram puts in the page, elsewhere as a message to its parent.

interface Webview {
  postEvent(eventType: string, eventData: string): void;
}

const webview = (): Webview | undefined =>
  (window as unknown as { TelegramWebviewProxy?: Webview })
    .TelegramWebviewProxy;

let opened = false;

/** This page was opened by the bot: it's inside Telegram until it closes. */
export function enterTelegram(): void {
  opened = true;
}

export function insideTelegram(): boolean {
  return opened || webview() !== undefined;
}

/** Telegram's picker of chats, to send a link with a line before it. */
export function shareInTelegram(url: string, text: string): void {
  const eventData = {
    path_full: `/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
  const proxy = webview();
  if (proxy) proxy.postEvent("web_app_open_tg_link", JSON.stringify(eventData));
  else
    window.parent.postMessage(
      JSON.stringify({ eventType: "web_app_open_tg_link", eventData }),
      "https://web.telegram.org",
    );
}
