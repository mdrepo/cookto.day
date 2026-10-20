import { describe, expect, test } from "bun:test";
import { memoryKeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/216: who this phone is signed in as, a setting of this phone like
// the role: the first name and when, never a token. The session itself is a
// cookie only the API reads.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

describe("signed in", () => {
  test("nobody to start; a sign-in is saved and comes back; sign-out clears it", () => {
    const kv = memoryKeyValue();
    const { store, writer } = createSettings(kv, options);
    expect(store.getState().signedIn).toBeNull();
    const me = { name: "Mayur", at: "2026-10-20T11:00:00.000Z" };
    writer.setSignedIn(me);
    expect(store.getState().signedIn).toEqual(me);
    expect(createSettings(kv, options).store.getState().signedIn).toEqual(me);
    writer.setSignedIn(null);
    expect(createSettings(kv, options).store.getState().signedIn).toBeNull();
  });

  test("something saved that isn't a sign-in counts as nobody", () => {
    const kv = memoryKeyValue();
    kv.set("cookto.day:signedIn", '{"token":"never-here"}');
    expect(createSettings(kv, options).store.getState().signedIn).toBeNull();
    kv.set("cookto.day:signedIn", "not json");
    expect(createSettings(kv, options).store.getState().signedIn).toBeNull();
  });
});
