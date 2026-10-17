// How the API answers (ADR 0025): JSON, never cached, never sniffed. An error
// is a short code that the app turns into words in each language (ADR 0012).

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...HEADERS, ...headers },
  });
}

export function problem(
  status: number,
  error: string,
  details: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Response {
  return json(status, { error, ...details }, headers);
}
