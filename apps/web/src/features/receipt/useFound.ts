import type { Receipt } from "@cookto/data";
import {
  type Adding,
  type Answer,
  type ReceiptRow,
  rowsToAdd,
} from "@cookto/engine";
import { useState } from "react";
import { namer, useLoadedPacks } from "../../food.js";
import type { Messages } from "../../i18n/en.js";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { receipts, today } from "../../platform.js";
import { setReceiptAdded } from "../../receipt.js";
import { open } from "../../routes.js";

// "Found in your receipt" (specs/129): found lines ticked, with their
// amounts; lines it isn't sure of, each answered with a food, "Add as it
// is" or "Skip". "Add {n}" adds what's ticked and answered, bought on the
// receipt's day, and the Fridge offers Undo.

/** The receipt's day when it has one that has passed or is today. */
const dayOf = (receipt: Receipt) =>
  receipt.date && receipt.date <= today() ? receipt.date : today();

/** A found row's words: "Paneer · 800 g", "Ginger · 150 g · Check this line". */
function labelOf(
  r: ReceiptRow,
  t: Messages,
  locale: string,
  name: ReturnType<typeof namer>,
) {
  const amount =
    r.amount === null || r.unit === null
      ? t.haveIt.toLocaleLowerCase(locale)
      : `${r.amount.toLocaleString(locale)} ${r.unit === "pieces" ? t.piecesUnit : r.unit}`;
  return [
    r.kind === "found" ? name("ingredients", r.food) : r.name,
    amount,
    r.check ? t.checkThisLine : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function useFound(receipt: Receipt, rows: readonly ReceiptRow[]) {
  const { locale, t } = useWords();
  const name = namer(useLoadedPacks(), locale);
  const [off, setOff] = useState<ReadonlySet<number>>(new Set());
  const [answers, setAnswers] = useState<ReadonlyMap<number, Answer>>(
    new Map(),
  );
  const adding = rowsToAdd(rows, off, answers);
  const label = (r: ReceiptRow) => labelOf(r, t, locale, name);
  const choice = (i: number, words: string, a: Answer) => ({
    label: words,
    pressed: JSON.stringify(answers.get(i)) === JSON.stringify(a),
    run: () => {
      setAnswers(new Map(answers).set(i, a));
    },
  });
  const rowsOf = rows.map((r, i) => ({ r, i }));
  return {
    foundLabel: t.foundInReceipt,
    found: rowsOf
      .filter(({ r }) => r.kind !== "not-sure")
      .map(({ r, i }) => ({
        key: String(i),
        label: label(r),
        checked: !off.has(i),
        onCheck: () => {
          const next = new Set(off);
          if (!next.delete(i)) next.add(i);
          setOff(next);
        },
      })),
    notSureLabel: t.notSure,
    notSure: rowsOf.flatMap(({ r, i }) =>
      r.kind === "not-sure"
        ? [
            {
              key: String(i),
              line: r.name,
              choices: [
                ...r.foods.map((food) =>
                  choice(i, name("ingredients", food), { food }),
                ),
                choice(i, t.addAsItIs, { asIs: true }),
                choice(i, t.skipLine, { skip: true }),
              ],
            },
          ]
        : [],
    ),
    add: {
      label: count(locale, t.addCount, adding.length),
      disabled: adding.length === 0,
      run: () => void addAll(receipt, rows, adding, answers),
    },
  };
}

/** "Add {n}": into the Fridge, the answers kept, and the Fridge opened with Undo. */
async function addAll(
  receipt: Receipt,
  rows: readonly ReceiptRow[],
  adding: readonly Adding[],
  answers: ReadonlyMap<number, Answer>,
) {
  const said = [...answers].flatMap(([i, a]) => {
    const r = rows[i];
    return r ? [{ name: r.name, answer: a }] : [];
  });
  const use = await import("@cookto/usecases/receipt");
  const added = await use.addFromReceipt(
    receipts,
    adding,
    said,
    dayOf(receipt),
  );
  setReceiptAdded({ count: adding.length, added });
  open("pantry");
}
