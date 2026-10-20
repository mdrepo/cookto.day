import { type Kit, words } from "../../kit.js";
import { JoinCode } from "./JoinCode.js";

// A small made-up matrix: a real one comes from @cookto/engine/qr.
const demo = Array.from({ length: 21 }, (_, r) =>
  Array.from({ length: 21 }, (_, c) => (r * 7 + c * 3) % 5 < 2),
);

export const kit: Kit = {
  name: "JoinCode",
  about:
    "A code to type or read out, large, with the same link as a QR code for a phone's camera (sign in, the cook's invite).",
  examples: [
    {
      title: "Code only",
      render: (lang) => (
        <JoinCode code="KM7Q-4HTX" label={words[lang].account} />
      ),
    },
    {
      title: "With the QR code",
      render: (lang) => (
        <JoinCode
          code="KM7Q-4HTX"
          label={words[lang].account}
          qr={demo}
          qrLabel={words[lang].qrCode}
        />
      ),
    },
  ],
};
