import { describe, expect, test } from "bun:test";
import { createPacks } from "@cookto/data";
import { evening, PLANNER_CHAT, TOMORROW } from "./tomorrow-support.js";

// specs/270-the-bot-talks-like-a-person.md, criterion 6: "Change" in the
// chat asks which meal, shows the three ideas Tomorrow ranks next for it,
// and picking one swaps it in the household's records, as a phone's swap
// would; then the question comes again, and the first one's buttons are
// done. Mayur and Priya eat lunch and dinner; tomorrow is dal tadka and
// palak paneer. The fake messenger, runs in memory and a fixed clock.

const SUNITA = { id: "77", name: "Sunita" };
const texts = (s: { text: string }[]) => s.map((x) => x.text);
const labels = (s: { buttons: { label: string }[] } | undefined) =>
  (s?.buttons ?? []).map((b) => b.label);

describe("6. change in the chat", () => {
  test("Change, Lunch, then an idea: lunch swapped, and the question again", async () => {
    const e = await evening({ cook: SUNITA });
    e.at("22:00");
    await e.tick();
    const first = e.h.channel.deliveries
      .filter((d) => d.chat === PLANNER_CHAT)
      .at(-1)?.message;
    const sendIt =
      first?.kind === "buttons"
        ? first.buttons.flat().find((b) => b.label === "Send it")
        : undefined;
    e.to(PLANNER_CHAT);

    await e.press(PLANNER_CHAT, "Change");
    const which = e.to(PLANNER_CHAT);
    expect(texts(which)).toEqual(["Which meal?"]);
    expect(labels(which.at(-1))).toEqual(["Lunch", "Dinner", "Open the app"]);

    await e.press(PLANNER_CHAT, "Lunch");
    const ideas = e.to(PLANNER_CHAT);
    expect(texts(ideas)).toEqual(["Instead of Dal tadka:"]);
    const offered = labels(ideas.at(-1));
    expect(offered).toHaveLength(4);
    expect(offered.at(-1)).toBe("More in the app");
    const [idea = ""] = offered;
    expect(new Set(offered.slice(0, 3)).size).toBe(3);
    expect(offered).not.toContain("Dal tadka");

    await e.press(PLANNER_CHAT, idea);
    // The idea's dish, by its name in the pack, is lunch now.
    const pack = await createPacks().load("north-indian");
    const lunch = e.server("plans", `plan:${TOMORROW}:lunch`);
    expect(pack.words.en?.dishes[String(lunch?.dish)]).toBe(idea);
    const again = e.to(PLANNER_CHAT);
    expect(texts(again)).toEqual([
      `Lunch is ${idea} now.`,
      "Shall I send it to Sunita?",
    ]);
    expect(labels(again.at(-1))).toEqual(["Send it", "Change", "No cooking"]);

    // The first question's buttons are done.
    if (!sendIt || !("value" in sendIt)) throw new Error("no Send it");
    await e.say(PLANNER_CHAT, {
      kind: "button",
      value: sendIt.value,
      answers: null,
    });
    expect(texts(e.to(PLANNER_CHAT))).toEqual(["That's done already."]);
  });
});
