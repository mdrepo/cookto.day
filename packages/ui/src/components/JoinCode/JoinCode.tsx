import styles from "./JoinCode.module.css";

export interface JoinCodeProps {
  /** The code as read out: "KM7Q-4HTX". */
  code: string;
  /** Names the code for screen readers: the section it's in. */
  label: string;
  /** The link as a QR code's modules, dark being true; none hides the image. */
  qr?: readonly (readonly boolean[])[] | null;
  /** What the image is, for screen readers: "QR code of the link". */
  qrLabel?: string;
}

/** Four modules of quiet zone on every side, as the standard asks. */
const QUIET = 4;

/**
 * A code to type or read out, large, with the same link as a QR code for a
 * phone's camera (specs/216, #217). The code is for a phone that can't scan
 * itself; the image is for a laptop's screen, or the cook scanning the
 * planner's phone.
 */
export function JoinCode({ code, label, qr = null, qrLabel }: JoinCodeProps) {
  const size = qr === null ? 0 : qr.length + QUIET * 2;
  return (
    <div className={styles.root}>
      <output className={styles.code} aria-label={label}>
        {code}
      </output>
      {qr !== null && (
        <svg
          className={styles.qr}
          role="img"
          aria-label={qrLabel}
          viewBox={`0 0 ${String(size)} ${String(size)}`}
          shapeRendering="crispEdges"
        >
          {qr.flatMap((row, r) =>
            row.flatMap((dark, c) =>
              dark
                ? [
                    <rect
                      key={`${String(r)}-${String(c)}`}
                      x={c + QUIET}
                      y={r + QUIET}
                      width={1}
                      height={1}
                    />,
                  ]
                : [],
            ),
          )}
        </svg>
      )}
    </div>
  );
}
