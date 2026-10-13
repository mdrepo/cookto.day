// Where people live (ADR 0026): it sets the currency and the shops whose
// bills we read. Singapore first; the others are coming soon (specs/65).

export const COUNTRIES = {
  SG: {
    currency: "S$",
    shops: [
      "RedMart",
      "GrabMart",
      "foodpanda mart",
      "Cold Storage",
      "Sheng Siong",
    ],
    soon: false,
  },
  IN: { currency: "₹", shops: ["Blinkit", "Zepto", "BigBasket"], soon: true },
  AE: {
    currency: "AED",
    shops: ["Carrefour", "noon Minutes", "talabat mart"],
    soon: true,
  },
} as const satisfies Record<
  string,
  { currency: string; shops: readonly string[]; soon: boolean }
>;

export type Country = keyof typeof COUNTRIES;

/** The countries people can choose today, in the order they're shown. */
export function openCountries(): Country[] {
  return (Object.keys(COUNTRIES) as Country[]).filter(
    (code) => !COUNTRIES[code].soon,
  );
}
