import type { AppPack, PackLoader } from "@cookto/data";
import { record } from "./household-support.js";
import {
  evening,
  type Evening,
  planRecord,
  settingsRecord,
} from "./tomorrow-support.js";

// specs/242's household (ADR 0034): Mayur's, from tomorrow-support, on the
// day itself: Wednesday 21 October in Kolkata, lunch at 13:00 and dinner at
// 20:00 for two adults, today's plan already gone to the cook (sorted
// today). The pantry has 500 g toor dal, 1 onion and rice with no amount.
// A small pack of its own, with the spec's amounts, so the numbers are the
// spec's whatever the real packs say.

export const TODAY = "2026-10-21";
export const TOOR = "Q103449274",
  ONION = "Q3406628",
  RICE = "Q5090",
  MILK = "Q8495";

const PACK: AppPack = {
  id: "test-kitchen",
  dishes: [
    {
      id: "dal-tadka",
      slots: ["lunch", "dinner"],
      ingredients: [TOOR, ONION, RICE],
      amounts: [
        [80, "g"],
        [1, "pieces"],
        [90, "g"],
      ],
    },
    {
      id: "palak-paneer",
      slots: ["lunch", "dinner"],
      ingredients: [ONION],
      amounts: [[0.5, "pieces"]],
    },
  ],
  names: { milk: MILK, "toor dal": TOOR, onion: ONION },
  fresh: {},
  staples: { "grains-and-dals": [], spices: [], basics: [] },
  sample: [],
  words: {
    en: {
      dishes: { "dal-tadka": "Dal tadka", "palak-paneer": "Palak paneer" },
      ingredients: { [MILK]: "milk", [TOOR]: "toor dal", [ONION]: "onion" },
      parts: {},
    },
  },
};

export const PACKS: PackLoader = {
  cuisines: () => [{ id: "test-kitchen", dishes: 2, soon: false }],
  load: (id) =>
    id === "test-kitchen"
      ? Promise.resolve(structuredClone(PACK))
      : Promise.reject(new Error(`no pack ${id}`)),
  steps: () => Promise.resolve({}),
};

const pantryItem = (id: string, fields: Record<string, unknown>) =>
  record("pantry", id, { boughtOn: "2026-10-18", ...fields });

/** The day of the meal checks: today planned, sent, and the pantry in. */
export async function theDay(
  more: { settings?: Record<string, unknown>; sent?: boolean } = {},
): Promise<Evening> {
  const e = await evening({
    plans: false,
    settings: {
      kitchen: { cuisines: ["test-kitchen"], skip: [], sample: null },
      ...more.settings,
    },
  });
  e.h.deps.packs = PACKS;
  await e.pushed(
    settingsRecord(
      {
        kitchen: { cuisines: ["test-kitchen"], skip: [], sample: null },
        sorted: more.sent === false ? null : TODAY,
        ...more.settings,
      },
      2,
    ),
    planRecord("lunch", "dal-tadka", 1, TODAY),
    planRecord("dinner", "palak-paneer", 1, TODAY),
    pantryItem("p-toor", { ingredient: TOOR, amount: 500, unit: "g" }),
    pantryItem("p-onion", { ingredient: ONION, amount: 1, unit: "pieces" }),
    pantryItem("p-rice", { ingredient: RICE }),
  );
  return e;
}

/** Records of a collection on the server, live ones. */
export const live = (e: Evening, collection: string) =>
  e.h.households.records
    .filter((r) => r.household === e.household && r.collection === collection)
    .map((r) => r.record)
    .filter((r) => r.deletedAt === null || r.deletedAt === undefined);
