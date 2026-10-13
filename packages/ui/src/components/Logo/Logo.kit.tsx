import { type Kit } from "../../kit.js";
import { Logo } from "./Logo.js";

export const kit: Kit = {
  name: "Logo",
  about: "The pot, the app's logo: in a warm card, on a light backing in dark.",
  examples: [
    { title: "Decoration", render: () => <Logo /> },
    { title: "Named", render: () => <Logo label="cookto.day" /> },
  ],
};
