import { describe, expect, test } from "bun:test";
import { githubRepo, provenanceRepo } from "../scripts/dependency-health.js";

describe("githubRepo", () => {
  test.each([
    ["git+https://github.com/facebook/react.git", "facebook/react"],
    ["https://github.com/react/react", "react/react"],
    ["git+https://github.com/react/react@refs/heads/main", "react/react"],
    ["github:vercel/turborepo", "vercel/turborepo"],
    [{ type: "git", url: "https://github.com/react/react.git" }, "react/react"],
    // The Scorecard service is case-sensitive: keep the case as written.
    ["https://github.com/Microsoft/TypeScript", "Microsoft/TypeScript"],
    ["git@github.com:react/react.git", "react/react"],
    ["ssh://git@github.com/react/react.git", "react/react"],
  ])("reads %p as %p", (input, repo) => {
    expect(githubRepo(input)).toBe(repo);
  });

  test.each([
    undefined,
    "",
    "https://gitlab.com/a/b",
    "not a url",
    // Only github.com itself: a path that mentions it is someone else's repo.
    "https://evil.example/github.com/react/react",
    "https://gitlab.com/evil/github.com/react/react",
    "https://github.com.evil.example/react/react",
  ])("is null for %p", (input) => {
    expect(githubRepo(input)).toBeNull();
  });
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

  test("reads only SLSA build provenance, not other statements", () => {
    const other = {
      predicateType: "https://example.com/not-provenance",
      predicate: {
        buildDefinition: {
          externalParameters: {
            workflow: { repository: "https://github.com/react/react" },
          },
        },
      },
    };
    expect(provenanceRepo(attestations(other))).toBeNull();
  });

  test("is null without build provenance", () => {
    expect(provenanceRepo(attestations({ predicateType: "x" }))).toBeNull();
    expect(provenanceRepo(null)).toBeNull();
  });
});
