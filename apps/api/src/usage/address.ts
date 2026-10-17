// ADR 0028: a network address is counted for a day, but never stored as it
// is. It's kept as an HMAC with a secret that only the counter knows, so the
// stored key can't be turned back into the address.

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export async function addressKey(
  secret: string,
  address: string,
): Promise<string> {
  const encode = (text: string) => new TextEncoder().encode(text);
  const key = await crypto.subtle.importKey(
    "raw",
    encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encode(address)));
}
