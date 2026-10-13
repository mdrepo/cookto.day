import { useId } from "react";
import { words, type Kit, type KitLanguage } from "../../kit.js";
import { Choice } from "./Choice.js";

/** One group per panel: every panel shows it, and a radio group's name is page-wide. */
function Places({
  lang,
  hideLegend = false,
}: {
  lang: KitLanguage;
  hideLegend?: boolean;
}) {
  return (
    <Choice
      legend={words[lang].whereTitle}
      hideLegend={hideLegend}
      name={useId()}
      value="sg"
      options={[
        {
          value: "sg",
          title: words[lang].singapore,
          detail: words[lang].sgDetail,
        },
        {
          value: "in",
          title: words[lang].india,
          detail: words[lang].inDetail,
          soon: words[lang].comingSoon,
        },
      ]}
      onChange={() => undefined}
    />
  );
}

export const kit: Kit = {
  name: "Choice",
  about:
    "One answer from a few cards: radio buttons, each a whole card. A card can be coming soon.",
  examples: [
    {
      title: "Chosen, and coming soon",
      render: (lang) => <Places lang={lang} />,
    },
    {
      title: "Question hidden",
      render: (lang) => <Places lang={lang} hideLegend />,
    },
  ],
};
