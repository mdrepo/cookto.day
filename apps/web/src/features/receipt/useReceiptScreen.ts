import type { Receipt } from "@cookto/data";
import type { ReceiptRow } from "@cookto/engine";
import { useEffect, useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import { shrink } from "../../photo.js";
import { api, receipts, settings } from "../../platform.js";
import { takeChosenPhoto } from "../../receipt.js";
import { goHome, openAddFood } from "../../routes.js";

// A receipt photo just chosen (specs/129): asked about once per phone, read
// by our API, then "Found in your receipt"; or what stopped it, in plain
// words, with "Tap what you bought" instead.

type Stopped = Awaited<
  ReturnType<typeof import("@cookto/usecases/receipt").readReceiptPhoto>
> & { ok: false };

export type Phase =
  | { kind: "none" }
  | { kind: "ask" }
  | { kind: "reading" }
  | { kind: "found"; receipt: Receipt; rows: ReceiptRow[] }
  | { kind: "stopped"; why: Stopped["why"] };

/** Where a photo starts: signed out, asked first, or read at once. */
function start(photo: Blob | null): Phase {
  const { signedIn, receiptsAgreed } = settings.store.getState();
  if (!photo) return { kind: "none" };
  if (signedIn === null) return { kind: "stopped", why: "signed-out" };
  return receiptsAgreed ? { kind: "reading" } : { kind: "ask" };
}

/** The photo made small, read, and its lines as rows. */
async function read(photo: Blob): Promise<Phase> {
  const use = await import("@cookto/usecases/receipt");
  const small = await shrink(photo);
  if (!small) return { kind: "stopped", why: "unavailable" };
  const got = await use.readReceiptPhoto(await api(), small);
  if (!got.ok) return { kind: "stopped", why: got.why };
  const rows = await use.receiptRows(receipts, got.receipt);
  return { kind: "found", receipt: got.receipt, rows };
}

export function useReceiptScreen() {
  const { t } = useWords();
  const [photo] = useState(takeChosenPhoto);
  const [phase, setPhase] = useState<Phase>(() => start(photo));
  const reading = phase.kind === "reading";
  useEffect(() => {
    if (phase.kind === "none") goHome();
    if (!reading || !photo) return;
    void read(photo)
      .catch((): Phase => ({ kind: "stopped", why: "unavailable" }))
      .then(setPhase);
  }, [phase.kind, reading, photo]);
  const stopped =
    phase.kind === "stopped"
      ? {
          "signed-out": t.signInForReceipts,
          "limit-day": t.receiptsToday,
          "limit-month": t.receiptsMonth,
          "not-a-receipt": t.notAReceipt,
          rejected: t.couldntRead,
          unavailable: t.receiptsNotWorking,
        }[phase.why]
      : null;
  return {
    phase,
    title: phase.kind === "found" ? t.foundInReceipt : t.addReceipt,
    back: { label: t.back, run: goHome },
    ask: {
      text: t.receiptConsent,
      label: t.readIt,
      run: () => {
        void import("@cookto/usecases/receipt").then((use) => {
          use.agreeToReceipts(settings.writer);
          setPhase({ kind: "reading" });
        });
      },
    },
    reading: t.readingReceipt,
    stopped,
    tap: { label: t.tapWhatYouBought, run: openAddFood },
  };
}
