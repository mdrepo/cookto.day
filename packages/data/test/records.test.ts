import { describe, expect, test } from "bun:test";
import { created, deleted, newId, updated } from "../src/records.js";

// specs/61-saving-data.md, criterion 1: records are ready for sync (ADR 0024).

const V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("records are ready for sync", () => {
  test("ids are UUID v7, unique, and in the order they were made", () => {
    const ids = Array.from({ length: 1000 }, () => newId());
    for (const id of ids) expect(id).toMatch(V7);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  test("each write adds 1 to the version and sets updatedAt", () => {
    const first = created({ name: "x" }, "2026-10-13T08:00:00.000Z");
    expect(first).toMatchObject({
      name: "x",
      version: 1,
      updatedAt: "2026-10-13T08:00:00.000Z",
      deletedAt: null,
    });
    const next = updated(first, { name: "y" }, "2026-10-13T09:00:00.000Z");
    expect(next).toMatchObject({
      id: first.id,
      name: "y",
      version: 2,
      updatedAt: "2026-10-13T09:00:00.000Z",
    });
  });

  test("deleting a record marks it, and keeps it", () => {
    const first = created({ name: "x" }, "2026-10-13T08:00:00.000Z");
    const gone = deleted(first, "2026-10-13T10:00:00.000Z");
    expect(gone).toMatchObject({
      id: first.id,
      name: "x",
      version: 2,
      deletedAt: "2026-10-13T10:00:00.000Z",
    });
  });
});
