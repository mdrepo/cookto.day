// The API's one way out (ADR 0028, 0031): a wrapper, not `fetch`, since
// Workers refuse a detached fetch. Lint allows `fetch` in this file only
// (tooling/scripts/eslint-server.js). The adapters receive it, so their
// tests pass their own.

/** All of `fetch` the API uses. */
export type Send = (url: string, init: RequestInit) => Promise<Response>;

export const network: Send = (url, init) => fetch(url, init);
