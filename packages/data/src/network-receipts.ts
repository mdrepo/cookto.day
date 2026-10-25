import type { Call } from "./network.js";

// Reading a receipt photo (specs/129): the photo goes to our API as itself,
// and what comes back is the API's checked lines. A refusal is an ApiError,
// with which limit when a limit was reached.

export interface ReceiptLine {
  name: string;
  /** A count, or a weight in kg for food sold loose. */
  qty: number;
  unitPrice?: number;
  amount: number;
  /** Quantity × price isn't the amount: the person should check it. */
  check: boolean;
}

export interface Receipt {
  shop?: string;
  /** YYYY-MM-DD */
  date?: string;
  lines: ReceiptLine[];
}

export interface ReceiptsApi {
  readReceipt(photo: Blob): Promise<Receipt>;
}

export const receiptsApi = (call: Call): ReceiptsApi => ({
  readReceipt: (photo) =>
    call("POST", "/api/receipts/read", undefined, photo) as Promise<Receipt>,
});
