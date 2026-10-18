import type { Kit } from "../../kit.js";
import { Reminders } from "./Reminders.js";

const items = {
  en: [
    {
      key: "tonight",
      text: "Tonight: soak the chickpeas, for tomorrow's lunch",
      line: "Chole",
      actions: [{ label: "Done", onPress: () => undefined }],
    },
    {
      key: "ask",
      text: "Did you soak the rajma last night?",
      line: "Rajma",
      actions: [
        { label: "Yes", onPress: () => undefined },
        { label: "No", onPress: () => undefined },
      ],
    },
    { key: "since", text: "Soaking since 9 pm", line: "Chole", actions: [] },
  ],
  ar: [
    {
      key: "tonight",
      text: "الليلة: انقع الحمص، من أجل غداء الغد",
      line: "تشولي",
      actions: [{ label: "تم", onPress: () => undefined }],
    },
    {
      key: "ask",
      text: "هل فعلت هذا الليلة الماضية: انقع الفاصوليا؟",
      line: "راجما",
      actions: [
        { label: "نعم", onPress: () => undefined },
        { label: "لا", onPress: () => undefined },
      ],
    },
    { key: "since", text: "منقوع منذ 9 مساءً", line: "تشولي", actions: [] },
  ],
};

// Reminders on the kit page: something to do, a question, and one under way.
export const kit: Kit = {
  name: "Reminders",
  about: "What's due, like prep for tomorrow, each with its buttons (#144).",
  examples: [
    {
      title: "Due, asked and under way",
      render: (lang) => <Reminders label="Prep" items={items[lang]} />,
    },
  ],
};
