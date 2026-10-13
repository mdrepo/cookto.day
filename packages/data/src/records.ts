// Records ready for sync from day one (ADR 0024): an id made on the device,
// a version that goes up on every write, and a deleted mark instead of
// removal, so login and sync later add to the data instead of migrating it.

export interface SyncRecord {
  id: string;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
}

let lastMs = 0;
let counter = 0;

/**
 * A UUID v7 (RFC 9562): the time it was made, then randomness. Ids made on
 * this device sort in the order they were made, even within a millisecond:
 * a 12-bit counter follows the time (the RFC's method 1).
 */
export function newId(): string {
  let ms = Date.now();
  if (ms > lastMs) {
    lastMs = ms;
    counter = Math.floor(Math.random() * 0x400); // room to count up
  } else {
    counter += 1;
    if (counter > 0xfff) {
      lastMs += 1;
      counter = 0;
    }
    ms = lastMs;
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = 0x70 | (counter >> 8);
  bytes[7] = counter & 0xff;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A new record, at version 1. */
export function created<T extends object>(
  fields: T,
  now: string,
): T & SyncRecord {
  return {
    ...fields,
    id: newId(),
    version: 1,
    updatedAt: now,
    deletedAt: null,
  };
}

/** The record with `changes`, one version up. */
export function updated<T extends SyncRecord>(
  record: T,
  changes: Partial<Omit<T, keyof SyncRecord>>,
  now: string,
): T {
  return { ...record, ...changes, version: record.version + 1, updatedAt: now };
}

/** The record marked deleted, one version up. It stays, so sync can tell. */
export function deleted<T extends SyncRecord>(record: T, now: string): T {
  return {
    ...record,
    version: record.version + 1,
    updatedAt: now,
    deletedAt: now,
  };
}
