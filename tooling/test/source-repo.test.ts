import { describe, expect, test } from "bun:test";
import { githubRepo, provenanceRepo } from "../scripts/dependency-health.js";

describe("githubRepo", () => {
  test.each([
    ["git+https://github.com/facebook/react.git", "facebook/react"],
    ["https://github.com/react/react", "react/react"],
    ["git+https://github.com/react/react@refs/heads/main", "react/react"],
    ["github:vercel/turborepo", "vercel/turborepo"],
    [
      { type: "git", url: "https://github.com/Vercel/Turborepo.git" },
      "vercel/turborepo",
    ],
  ])("reads %p as %p", (input, repo) => {
    expect(githubRepo(input)).toBe(repo);
  });

  test.each([undefined, "", "https://gitlab.com/a/b", "not a url"])(
    "is null for %p",
    (input) => {
      expect(githubRepo(input)).toBeNull();
    },
  );
});

/** An npm attestations response, with each statement base64-encoded. */
const attestations = (...statements: object[]) => ({
  attestations: statements.map((s) => ({
    bundle: {
      dsseEnvelope: {
        payload: Buffer.from(JSON.stringify(s)).toString("base64"),
      },
    },
  })),
});

describe("provenanceRepo", () => {
  test("reads the repo the package was built from", () => {
    const slsa = {
      predicateType: "https://slsa.dev/provenance/v1",
      predicate: {
        buildDefinition: {
          externalParameters: {
            workflow: { repository: "https://github.com/react/react" },
          },
        },
      },
    };
    const publish = { predicateType: "https://github.com/npm/attestation" };
    expect(provenanceRepo(attestations(publish, slsa))).toBe("react/react");
  });

  test("is null without build provenance", () => {
    expect(provenanceRepo(attestations({ predicateType: "x" }))).toBeNull();
    expect(provenanceRepo(null)).toBeNull();
  });
});
