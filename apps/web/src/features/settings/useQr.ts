import { useEffect, useState } from "react";

// The bot's link as a QR code (specs/216, #217): the encoder loads when a
// code first shows, so Settings stays small until then. On a phone the
// sign-in's code is enough, since a phone can't scan itself; the cook's
// invite shows it everywhere, because she scans the planner's phone.

type Matrix = readonly (readonly boolean[])[];

const WIDE = "(min-width: 840px)";

/** Whether this is a wide screen, like a laptop, as the layout decides it. */
export function useWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof matchMedia === "function" && matchMedia(WIDE).matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia(WIDE);
    const update = () => {
      setWide(query.matches);
    };
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);
  return wide;
}

/** The link's QR code, once it's wanted and the encoder has loaded. */
export function useQr(link: string | null, wanted: boolean): Matrix | null {
  const [qr, setQr] = useState<{ link: string; matrix: Matrix } | null>(null);
  useEffect(() => {
    if (link === null || !wanted) return;
    let stale = false;
    void import("@cookto/engine/qr").then(({ qrMatrix }) => {
      if (!stale) setQr({ link, matrix: qrMatrix(link) });
    });
    return () => {
      stale = true;
    };
  }, [link, wanted]);
  return qr !== null && qr.link === link && wanted ? qr.matrix : null;
}
