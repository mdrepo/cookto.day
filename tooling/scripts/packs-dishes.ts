import { PREP_KINDS } from "../../packages/engine/src/prep.js";
import type { Dish, Pack } from "./packs-lib.js";

// packs:check's rules for a pack's dishes (packs-lib.ts runs them all): each
// dish's sources, steps, note, slots and amounts (specs/72, 149), and its
// photo's credit and files (specs/118).

const SLOTS = [
  "breakfast",
  "morning-snack",
  "lunch",
  "evening-snack",
  "dinner",
];
export const UNITS = ["g", "ml", "pieces"];

const LINK = /^https:\/\/\S+$/;
const HOME = /^cooked at home by \S.*$/;
/** Words a reviewer leaves for later; a note ships as it is (specs/149). */
const UNSETTLED = /\b(check|looks low|summary)\b/i;
const MAX_STEP = 140;

function sourceProblems(at: string, dish: Dish): string[] {
  const sources: unknown = dish.sources;
  const ok =
    Array.isArray(sources) &&
    sources.length > 0 &&
    sources.every(
      (s) => typeof s === "string" && (LINK.test(s) || HOME.test(s)),
    );
  if (!ok)
    return [
      `${at}: no sources. Add "sources": the https links of two or three full recipes you read, or "cooked at home by <reviewer>".`,
    ];
  if (sources.length === 1 && LINK.test(String(sources[0])))
    return [
      `${at}: one source. Check it against a second full recipe, and add that link too.`,
    ];
  return [];
}

function stepProblems(at: string, dish: Dish): string[] {
  const steps = Array.isArray(dish.steps) ? dish.steps : [];
  // Plain fruit, bread and butter: a step or three is enough (specs/145).
  if (dish.simple && (steps.length < 1 || steps.length > 3))
    return [
      `${at}: has ${String(steps.length)} steps. A simple dish has one to three.`,
    ];
  if (!dish.simple && (steps.length < 6 || steps.length > 8))
    return [
      `${at}: has ${String(steps.length)} steps. Write six to eight short steps, one action each.`,
    ];
  return steps.flatMap((step, i) =>
    step.trim() === "" || step.length > MAX_STEP
      ? [
          `${at}: step ${String(i + 1)} is long. Keep each step to one action, under ${String(MAX_STEP)} characters.`,
        ]
      : [],
  );
}

/** A child's dish says so; its add-ins are foods the pack knows (#145). */
function childProblems(at: string, dish: Dish, pack: Pack): string[] {
  const problems: string[] = [];
  if (dish.for && (dish.for.length !== 1 || dish.for[0] !== "child"))
    problems.push(`${at}: "for" can only be ["child"].`);
  for (const [food, use] of Object.entries(dish.addIns ?? {}))
    if (
      !(food in pack.ingredients) ||
      !(use.amount > 0) ||
      !UNITS.includes(use.unit)
    )
      problems.push(
        `${at}: its add-in ${food} has no ingredients/${food}.json, or no amount in g, ml or pieces.`,
      );
  return problems;
}

/** Each prep is a known kind, done to one of the dish's ingredients (#144). */
function prepProblems(at: string, dish: Dish): string[] {
  const kinds: readonly string[] = PREP_KINDS;
  return (dish.prep ?? []).flatMap((p, i) =>
    kinds.includes(p.do) && p.what in dish.ingredients && p.hours > 0
      ? []
      : [
          `${at}: prep ${String(i + 1)} must be one of ${PREP_KINDS.join(", ")}, done to one of its ingredients, some hours before.`,
        ],
  );
}

export function dishProblems(pack: Pack): string[] {
  return Object.entries(pack.dishes).flatMap(([slug, dish]) => {
    const at = `${pack.id}/dishes/${slug}.json`;
    const problems = [...sourceProblems(at, dish), ...stepProblems(at, dish)];
    if (dish.note !== undefined && UNSETTLED.test(dish.note))
      problems.push(
        `${at}: its note still asks for a check ("${dish.note}"). A note ships as it is: settle it, then say what was decided.`,
      );
    problems.push(...prepProblems(at, dish), ...childProblems(at, dish, pack));
    if (dish.slots.length === 0 || dish.slots.some((s) => !SLOTS.includes(s)))
      problems.push(`${at}: slots must be some of ${SLOTS.join(", ")}.`);
    for (const [ing, use] of Object.entries(dish.ingredients)) {
      if (!(ing in pack.ingredients))
        problems.push(
          `${at}: uses ${ing}, which has no ingredients/${ing}.json.`,
        );
      else if (!(use.amount > 0) || !UNITS.includes(use.unit))
        problems.push(
          `${at}: ${ing} needs an amount per serving above 0, in g, ml or pieces.`,
        );
    }
    for (const part of dish.servedWith ?? [])
      if (!pack.parts.includes(part))
        problems.push(
          `${at}: served with ${part}, which pack.json's parts don't list.`,
        );
    return problems;
  });
}

/** Photo licences we can use (specs/118): free, with credit at most. */
const LICENCE = /^(Public domain|CC0( 1\.0)?|CC BY(-SA)? \d\.\d)$/;
const COMMONS = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/;
const MAX = { large: 40_000, small: 8_000 } as const;

/** Every photo credited and small; every credit with its files (specs/118). */
export function photoProblems(pack: Pack): string[] {
  const files = pack.photos ?? {};
  const problems: string[] = [];
  for (const [slug, dish] of Object.entries(pack.dishes)) {
    const photo = dish.photo;
    if (!photo) continue;
    const at = `${pack.id}/dishes/${slug}.json`;
    if (!photo.author.trim())
      problems.push(
        `${at}: its photo has no author. Copy "Author" from its Commons page.`,
      );
    if (!LICENCE.test(photo.licence))
      problems.push(
        `${at}: its photo's licence, ${photo.licence}, isn't one we can use. Pick a photo in the public domain, or under CC0, CC BY or CC BY-SA.`,
      );
    if (!COMMONS.test(photo.source))
      problems.push(
        `${at}: its photo's "source" must be its page on commons.wikimedia.org.`,
      );
    if (!(slug in files))
      problems.push(
        `${at}: its photo has no files. Add photos/${slug}.webp and photos/${slug}.small.webp.`,
      );
  }
  for (const [slug, sizes] of Object.entries(files)) {
    const at = `${pack.id}/photos/${slug}`;
    if (!pack.dishes[slug]?.photo) {
      problems.push(
        `${at}.webp: no dish credits it. Add "photo" to its dish, or remove the files.`,
      );
      continue;
    }
    for (const size of ["large", "small"] as const)
      if (sizes[size] > MAX[size])
        problems.push(
          `${at}${size === "small" ? ".small" : ""}.webp: ${String(Math.round(sizes[size] / 1000))} KB, over ${String(MAX[size] / 1000)} KB. Make it smaller.`,
        );
  }
  return problems;
}
