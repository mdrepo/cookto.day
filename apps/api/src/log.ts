// The API's only way to log (ADR 0028), and the only file allowed `console`.
// An entry holds codes and numbers only, so nothing a person sends, and no
// address or account, can reach a log line.

export interface LogEntry {
  route: string;
  status: number;
  /** The error code the answer carried, if any. */
  error?: string;
  /** Why an answer was rejected as abuse (spec #129, rule 8). */
  sign?: string;
  /** Time spent, in milliseconds. */
  ms: number;
  /** How many receipt lines came back. */
  lines?: number;
  tokensIn?: number;
  tokensOut?: number;
}

export function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}
