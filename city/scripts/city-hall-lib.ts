import type { Gate } from "./city-borders-lib.js";
import type { Notice, NoticeItem, Rule } from "./city-gaps-lib.js";

// The town hall and the asks (bun run city). The town hall keeps the rules
// about how work is done: each says what guards it and how it stands now,
// and a rule about a place points at its gate. Every notice item carries an
// ask: a sentence to hand to an agent or file as an issue. Pure; unit tests
// in test/city-borders.test.ts.

export interface Standing {
  /** kept: nothing over its wall; over: something is; near: close to a limit; guarded: a check holds it; you: only you read it. */
  state: "kept" | "over" | "near" | "guarded" | "you";
  text: string;
}
export interface HallRule extends Rule {
  /** The gate this rule stands at, when it governs a place. */
  gate?: string;
  now: Standing;
}

/** The rules that govern a place, by the gate they stand at. */
const AT: [RegExp, string][] = [
  [/^React is the only package/, "customs"],
  [/^Nothing leaves the browser/, "leave"],
  [/^Secrets live only/, "vault"],
  [/^The database changes/, "db"],
  [/^Rules live in their layer/, "oneway"],
  [/^The look comes from/, "kit"],
];

/** Each rule with its gate, if it has one, and how it stands now. */
export function conduct(
  rules: Rule[],
  all: Gate[],
  notices: Notice[],
): HallRule[] {
  const near = notices.find((n) => n.id === "cap")?.items ?? [];
  return rules.map((r) => {
    const id = AT.find(([re]) => re.test(r.title))?.[1];
    const gate = all.find((g) => g.id === id);
    if (gate)
      return {
        ...r,
        gate: gate.id,
        now: gate.over.length
          ? { state: "over", text: `${gate.over.length} over the wall` }
          : { state: "kept", text: "Kept: nothing over the wall" },
      };
    if (/^Small files/.test(r.title) && near.length)
      return {
        ...r,
        now: near.some((it) => it.text.includes("over the law"))
          ? { state: "over", text: "A file is over its limit" }
          : { state: "near", text: `${near.length} files near the limit` },
      };
    return {
      ...r,
      now: r.guarded
        ? { state: "guarded", text: "Guarded" }
        : { state: "you", text: "You read it" },
    };
  });
}

const path = (it: NoticeItem) => it.ids?.[0] ?? it.file ?? "";

/** The sentence to hand on, for each kind of notice. */
const ASKS: Record<string, (it: NoticeItem) => string> = {
  wall: (it) =>
    `${it.text}. Change the code so it goes through the gate instead, with no change in what the app does.`,
  door: (it) =>
    `In ${it.ids?.[0]}, import ${it.ids?.[1]} through a name its package.json exports, not by its path.`,
  shelf: (it) => `Add the missing foods to packs/ingredients: ${it.text}.`,
  walk: (it) =>
    `Write an e2e walk in apps/web/e2e/ that reaches ${path(it)}, or cite its spec in the walk that already covers it.`,
  permit: (it) =>
    `Cite ${it.file} in the test that checks it, or write that test.`,
  cap: (it) =>
    `Split ${path(it)} into smaller files before it passes its line limit, as a refactor PR with no change in behaviour.`,
  inspect: (it) =>
    `Add a unit test file for ${path(it)} in ${/ in (\S+\/test)$/.exec(it.text)?.[1] ?? "its package's test folder"}, covering what it exports.`,
  copy: (it) =>
    `Move the shared lines into one place both files can use: ${it.text}.`,
  twin: (it) =>
    `${it.text}: check whether it is one job written twice, and if so keep one.`,
  sign: (it) =>
    `${it.text}. Keep one key for this text and remove the other, in all four languages.`,
  dish: (it) => `${it.text}: keep one and remove the other.`,
  testdoor: (it) =>
    `${it.text}: test it through what the app uses, or stop exporting it.`,
};

/** Every item with its ask. A watch item asks you to take a look. */
export function withAsks(notices: Notice[]): Notice[] {
  return notices.map((n) => ({
    ...n,
    items: n.items.map((it) => ({
      ...it,
      ask: (ASKS[n.id] ?? ((x: NoticeItem) => `Take a look: ${x.text}.`))(it),
    })),
  }));
}
