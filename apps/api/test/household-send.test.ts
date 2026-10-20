import { beforeEach, describe, expect, test } from "bun:test";
import { send } from "../src/messenger/send.js";
import { as, home, joined, MAYUR, signedInAs } from "./household-flow.js";
import { linked } from "./messenger-flow.js";
import { ask, type Harness, harness } from "./messenger-support.js";

// specs/217, criterion 14: "Looks good" sends through the household. With a
// session, the text goes to every cook of the household; a phone that never
// signed in still sends with its link's token, as spec #207 had it.

let h: Harness;
beforeEach(() => {
  h = harness();
});

describe("14. sending through the household", () => {
  test("with a session and a cook: 202, and the drain sends to her chat", async () => {
    const { session } = await home(h);
    await joined(h, session, "cook", "chat-7");
    h.channel.deliveries.length = 0;
    const response = await send(
      as(session, "POST", "/api/messenger/send", {
        text: "Tomorrow\nLunch: Chole",
        context: "plan:2026-10-21",
      }),
      h.deps,
    );
    expect(response.status).toBe(202);
    const { id } = (await response.json()) as { id: string };
    await h.settle();
    expect(h.channel.deliveries).toEqual([
      {
        chat: "chat-7",
        message: { kind: "text", text: "Tomorrow\nLunch: Chole" },
        edits: undefined,
      },
    ]);
    expect(await h.store.message(id)).toMatchObject({
      status: "sent",
      context: "plan:2026-10-21",
    });
  });

  test("two cooks both get it; the 21st send of the day is 429", async () => {
    const { session } = await home(h);
    await joined(h, session, "cook", "chat-7");
    await joined(h, session, "cook", "chat-8");
    h.channel.deliveries.length = 0;
    for (let i = 0; i < 20; i++) {
      const response = await send(
        as(session, "POST", "/api/messenger/send", { text: `v${String(i)}` }),
        h.deps,
      );
      expect(response.status).toBe(202);
    }
    await h.settle();
    expect(
      h.channel.deliveries.filter((d) => d.chat === "chat-7"),
    ).toHaveLength(20);
    expect(
      h.channel.deliveries.filter((d) => d.chat === "chat-8"),
    ).toHaveLength(20);
    const over = await send(
      as(session, "POST", "/api/messenger/send", { text: "one more" }),
      h.deps,
    );
    expect(over.status).toBe(429);
  });

  test("no cook in the household: 409 no-cook; a cook who stopped counts as none", async () => {
    const { session } = await home(h);
    const none = await send(
      as(session, "POST", "/api/messenger/send", { text: "hi" }),
      h.deps,
    );
    expect(none.status).toBe(409);
    expect(await none.json()).toEqual({ error: "no-cook" });
    await joined(h, session, "cook", "chat-7");
    const c = await h.store.find("fake", "chat-7");
    await h.store.remove(c?.id ?? "");
    const stopped = await send(
      as(session, "POST", "/api/messenger/send", { text: "hi" }),
      h.deps,
    );
    expect(stopped.status).toBe(409);
  });

  test("no session and no token: 401; a session without a household: 403", async () => {
    const bare = await send(
      ask("POST", "/api/messenger/send", { text: "hi" }),
      h.deps,
    );
    expect(bare.status).toBe(401);
    const session = await signedInAs(h, MAYUR);
    const homeless = await send(
      as(session, "POST", "/api/messenger/send", { text: "hi" }),
      h.deps,
    );
    expect(homeless.status).toBe(403);
  });

  test("a phone that never signed in still sends with its link's token", async () => {
    const made = await linked(h);
    const response = await send(
      ask("POST", "/api/messenger/send", { text: "old way" }, made.token),
      h.deps,
    );
    expect(response.status).toBe(202);
    await h.settle();
    expect(h.channel.deliveries.at(-1)).toMatchObject({
      chat: "chat-1",
      message: { kind: "text", text: "old way" },
    });
  });
});
