import { afterAll, beforeAll, beforeEach, describe } from "bun:test";
import { storeContract } from "@cookto/messenger/contract";
import { functionStore } from "../src/store.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/207, criterion 18, on Postgres: the store the migrations make passes
// the same contract as the one in memory (ADR 0031, 0032). Runs where a
// database is: CI, or a laptop with DATABASE_URL set.

const sql = DATABASE_URL ? connect() : null;

describe.skipIf(sql === null)("Postgres, through the migrations", () => {
  beforeAll(async () => {
    if (sql) await allow(sql);
  });
  beforeEach(async () => {
    if (sql) await wipe(sql);
  });
  afterAll(async () => {
    if (sql) await sql.close();
  });

  if (sql)
    storeContract("The Postgres store", () =>
      functionStore(sqlCall(sql), SECRET),
    );
});
