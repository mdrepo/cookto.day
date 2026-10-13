import { describe, test } from "bun:test";
import { RECORD_STORE_CONTRACT } from "@cookto/testing/record-store-contract";
import { memoryRecordStore } from "../src/record-store.js";

// specs/61-saving-data.md, criterion 2: a record store keeps what's put in
// it. The contract every record store must pass, run on the one in memory.

describe("the record store in memory", () => {
  for (const { name, check } of RECORD_STORE_CONTRACT)
    test(name, async () => {
      await check(() => memoryRecordStore());
    });
});
