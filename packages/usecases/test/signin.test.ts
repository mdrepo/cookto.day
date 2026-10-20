import { describe, expect, test } from "bun:test";
import { createSettings, memoryKeyValue, type SignInApi } from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import {
  checkSignedIn,
  signInConnected,
  signOut,
  startSignIn,
} from "../src/signin.js";

// specs/216, the use cases: start a sign-in, poll until Start happened, sign
// out, and what the phone does when the API says the session is gone.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

const T0 = "2026-10-20T11:00:00.000Z";
const MADE = {
  code: "KM7Q4HTX",
  token: "tok",
  expiresAt: "2026-10-20T11:10:00.000Z",
};
const ME = { name: "Mayur", at: T0 };

/** A fake API that answers as told and remembers what was asked. */
function api(answers: Partial<SignInApi> = {}) {
  const asked: string[] = [];
  const a = {
    startSignIn: () => {
      asked.push("start");
      return Promise.resolve(MADE);
    },
    signInStatus: () => {
      asked.push("status");
      return Promise.resolve({
        used: false as const,
        state: "waiting" as const,
      });
    },
    me: () => {
      asked.push("me");
      return Promise.resolve({ name: "Mayur" });
    },
    signOut: () => {
      asked.push("signOut");
      return Promise.resolve();
    },
    ...answers,
  };
  return { api: a, asked };
}

const settings = () => createSettings(memoryKeyValue(), options);
const refuse = (status: number, code: string) => () =>
  Promise.reject(new ApiError(status, code));

describe("signing in", () => {
  test("start asks for a link; polling saves the name once Start happened", async () => {
    const s = settings();
    const { api: a } = api({
      signInStatus: () => Promise.resolve({ used: true, name: "Mayur" }),
    });
    expect(await startSignIn({ api: a })).toEqual(MADE);
    const deps = { api: a, settings: s.writer };
    expect(await signInConnected(deps, MADE, T0)).toBe("signed-in");
    expect(s.store.getState().signedIn).toEqual(ME);
  });

  test("waiting while nobody pressed Start; expired once the code ran out", async () => {
    const s = settings();
    const deps = { api: api().api, settings: s.writer };
    expect(await signInConnected(deps, MADE, T0)).toBe("waiting");
    expect(s.store.getState().signedIn).toBeNull();
    expect(await signInConnected(deps, MADE, "2026-10-20T11:10:00.000Z")).toBe(
      "expired",
    );
    const { api: a } = api({
      signInStatus: () =>
        Promise.resolve({ used: false, state: "expired" as const }),
    });
    expect(
      await signInConnected({ api: a, settings: s.writer }, MADE, T0),
    ).toBe("expired");
  });

  test("a link that's gone, or the API not answering, reads as expired", async () => {
    const s = settings();
    const gone = api({ signInStatus: refuse(404, "gone") }).api;
    expect(
      await signInConnected({ api: gone, settings: s.writer }, MADE, T0),
    ).toBe("expired");
    const down = api({ signInStatus: refuse(0, "network") }).api;
    expect(
      await signInConnected({ api: down, settings: s.writer }, MADE, T0),
    ).toBe("waiting");
  });
});

describe("staying signed in", () => {
  test("the session still works: the name is kept fresh", async () => {
    const s = settings();
    s.writer.setSignedIn({ name: "M", at: T0 });
    const { api: a, asked } = api();
    expect(await checkSignedIn({ api: a, settings: s.writer }, ME.at)).toBe(
      "signed-in",
    );
    expect(asked).toEqual(["me"]);
    expect(s.store.getState().signedIn).toEqual({ name: "Mayur", at: T0 });
  });

  test("401: signed out elsewhere, so this phone forgets the name", async () => {
    const s = settings();
    s.writer.setSignedIn(ME);
    const a = api({ me: refuse(401, "session") }).api;
    expect(await checkSignedIn({ api: a, settings: s.writer }, T0)).toBe(
      "signed-out",
    );
    expect(s.store.getState().signedIn).toBeNull();
  });

  test("no network: nothing changes", async () => {
    const s = settings();
    s.writer.setSignedIn(ME);
    const a = api({ me: refuse(0, "network") }).api;
    expect(await checkSignedIn({ api: a, settings: s.writer }, T0)).toBe(
      "unknown",
    );
    expect(s.store.getState().signedIn).toEqual(ME);
  });
});

describe("signing out", () => {
  test("ends the session and forgets the name, even when the API says no", async () => {
    const s = settings();
    s.writer.setSignedIn(ME);
    const { api: a, asked } = api();
    await signOut({ api: a, settings: s.writer });
    expect(asked).toEqual(["signOut"]);
    expect(s.store.getState().signedIn).toBeNull();

    const t = settings();
    t.writer.setSignedIn(ME);
    await signOut({
      api: api({ signOut: refuse(0, "network") }).api,
      settings: t.writer,
    });
    expect(t.store.getState().signedIn).toBeNull();
  });
});
