import type { Messages } from "../../i18n/en.js";

// A cuisine's name in the page's language, by its pack's id.

const NAMES: Partial<
  Record<
    string,
    | "northIndian"
    | "maharashtrian"
    | "ourKitchen"
    | "southIndian"
    | "european"
    | "sriLankan"
  >
> = {
  "north-indian": "northIndian",
  maharashtrian: "maharashtrian",
  "our-kitchen": "ourKitchen",
  "south-indian": "southIndian",
  european: "european",
  "sri-lankan": "sriLankan",
};

export function cuisineName(t: Messages, id: string): string {
  const key = NAMES[id];
  return key ? t[key] : id;
}
