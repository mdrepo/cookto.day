import { SQL } from "bun";
import { type Call, FUNCTIONS } from "../src/functions.js";

// Calling the migrations' functions through a Postgres client (ADR 0032):
// what CI uses against a throwaway database with every migration applied.
// The API reaches the same functions over HTTPS; both get the same rows.

export const SECRET = "test-secret-not-a-real-one";

/** Only when a database is there: locally the tests skip without one. */
export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export function connect(): SQL {
  return new SQL(DATABASE_URL);
}

/** Stores the test secret's hash, as `migrate.sh secret` would. */
export async function allow(sql: SQL): Promise<void> {
  await sql`insert into api_secrets (name, hash)
    values ('messenger', encode(extensions.digest(${SECRET}, 'sha256'), 'hex'))
    on conflict (name) do update set hash = excluded.hash`;
}

/** Every row of every table, gone, for a fresh test. */
export async function wipe(sql: SQL): Promise<void> {
  await sql`truncate conversations, messages, outbox, seen_updates, links, link_requests,
    accounts, identities, sessions, households, members, records, changes`;
}

/** A Call that runs `select fn(p_a => $1::type, ...)`. */
export function sqlCall(sql: SQL): Call {
  return async (fn, args) => {
    const types = FUNCTIONS[fn] as Record<string, string>;
    const names = Object.keys(types);
    const params = names.map(
      (name, i) => `${name} => $${String(i + 1)}::${types[name] ?? "text"}`,
    );
    // A jsonb argument goes as the value itself: the client encodes it, and
    // would encode a pre-encoded string once more.
    const values = names.map((name) => args[name] ?? null);
    const rows: { r: unknown }[] = await sql.unsafe(
      `select ${fn}(${params.join(", ")}) as r`,
      values,
    );
    const r = rows[0]?.r;
    // jsonb may arrive parsed or as text, depending on the client's version.
    if (typeof r === "string" && /^[[{]/.test(r))
      return JSON.parse(r) as unknown;
    return r ?? null;
  };
}
