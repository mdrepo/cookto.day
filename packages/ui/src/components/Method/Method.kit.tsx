import type { Kit } from "../../kit.js";
import { Method } from "./Method.js";

const steps = {
  en: [
    "Rinse the dal and boil it with turmeric until soft.",
    "Heat the ghee and fry the cumin until it crackles.",
    "Add the onion, then the tomato, and cook until soft.",
    "Pour the tadka over the dal and simmer for five minutes.",
  ],
  ar: [
    "اغسل العدس واسلقه مع الكركم حتى يلين.",
    "سخّن السمن وقلّب الكمون حتى يطقطق.",
    "أضف البصل ثم الطماطم واطبخ حتى تلين.",
    "اسكب التتبيلة على العدس واتركه خمس دقائق.",
  ],
};

// Method on the kit page: a dish's steps, in English and Arabic.
export const kit: Kit = {
  name: "Method",
  about: "A dish's steps, numbered, one action each (#149).",
  examples: [
    {
      title: "Steps",
      render: (lang) => <Method label="Steps" steps={steps[lang]} />,
    },
  ],
};
