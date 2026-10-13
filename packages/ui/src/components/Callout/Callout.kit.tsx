import { words, type Kit } from "../../kit.js";
import { Button } from "../Button/Button.js";
import { Logo } from "../Logo/Logo.js";
import { Callout } from "./Callout.js";

export const kit: Kit = {
  name: "Callout",
  about:
    "A warm card: a soft fill, a title, a sentence and its buttons. For a welcome or a sample.",
  examples: [
    {
      title: "Sample kitchen",
      render: (lang) => (
        <Callout
          title={words[lang].sampleKitchen}
          actions={
            <>
              <Button kind="main">{words[lang].chooseWhatYouCook}</Button>
              <Button kind="quiet">{words[lang].clearSample}</Button>
            </>
          }
        >
          {words[lang].sampleBody}
        </Callout>
      ),
    },
    {
      title: "With the logo",
      render: (lang) => (
        <Callout
          title={words[lang].emptyTitle}
          art={<Logo />}
          actions={<Button kind="main">{words[lang].chooseWhatYouCook}</Button>}
        >
          {words[lang].emptyBody}
        </Callout>
      ),
    },
    {
      title: "Just a title",
      render: (lang) => <Callout title={words[lang].emptyTitle} />,
    },
  ],
};
