import { describe, expect, test } from "bun:test";
import { telegram } from "../src/telegram.js";
import { fakeNetwork } from "./contract.js";

// specs/241: a button that opens a page inside the chat. On Telegram it is
// a web app button, so the page opens in Telegram's own window with the
// proof of who opened it. The token is made up.

describe("a button that opens a page inside the chat", () => {
  test("Telegram gets a web app button, beside the others in its row", async () => {
    const net = fakeNetwork();
    await telegram({
      token: "123456:made-up-token",
      secret: "made-up-secret",
      send: net.send,
    }).deliver("123", {
      kind: "buttons",
      text: "Tomorrow, Thursday:",
      buttons: [
        [
          { label: "Looks good", value: "w:run1:ask:good" },
          { label: "Change", app: "https://cookto.day/?from=telegram" },
        ],
      ],
    });
    const body = JSON.parse(net.calls[0]?.body ?? "") as {
      reply_markup: { inline_keyboard: unknown[][] };
    };
    expect(body.reply_markup.inline_keyboard).toEqual([
      [
        { text: "Looks good", callback_data: "w:run1:ask:good" },
        {
          text: "Change",
          web_app: { url: "https://cookto.day/?from=telegram" },
        },
      ],
    ]);
  });
});
