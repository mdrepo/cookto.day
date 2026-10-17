// ADR 0028: how many receipt photos the AI reads. Changing a number is a PR
// that says why (docs/runbooks/receipt-photos.md). Checked in this order, so
// a family hears about its own limit before anyone else's.

export const LIMITS = [
  { name: "household-day", per: "household", period: "day", max: 3 },
  { name: "household-month", per: "household", period: "month", max: 30 },
  { name: "address-day", per: "address", period: "day", max: 20 },
  { name: "everyone-day", per: "everyone", period: "day", max: 2000 },
] as const;

export type Limit = (typeof LIMITS)[number];
export type LimitName = Limit["name"];
