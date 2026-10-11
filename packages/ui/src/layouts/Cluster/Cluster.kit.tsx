import { Button } from "../../components/Button/Button.js";
import { words, type Kit } from "../../kit.js";
import { Cluster } from "./Cluster.js";

export const kit: Kit = {
  name: "Cluster",
  about:
    "Parts side by side, wrapping when they don't fit. Starts from the right in Arabic.",
  examples: [
    {
      title: "Wrapping",
      render: (lang) => (
        <Cluster>
          <Button icon="plus">{words[lang].addBill}</Button>
          <Button kind="quiet">{words[lang].save}</Button>
          <Button kind="quiet">{words[lang].cook}</Button>
          <Button kind="quiet">{words[lang].cancel}</Button>
          <Button kind="danger">{words[lang].remove}</Button>
        </Cluster>
      ),
    },
  ],
};
