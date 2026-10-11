import { describe, expect, test } from "bun:test";
import {
  checkAdrChange,
  checkApprovedSpec,
  checkTddCommits,
  checkTitle,
  checkUiChangesHaveE2e,
  claimedExemption,
  exemptionNotice,
  linkedIssue,
} from "../scripts/pr-rules.js";

describe("checkTitle", () => {
  test.each([
    "fix(pantry): count days left from the bill date",
    "feat: suggest dishes that use what is about to go off",
    "refactor!: rename the pantry storage key",
  ])("accepts %p", (title) => {
    expect(checkTitle(title)).toEqual([]);
  });

  test.each([
    "Fixed the pantry",
    "style: format code",
    "fix: ",
    "fix(Pantry): capital scope",
  ])("rejects %p", (title) => {
    expect(checkTitle(title)).toHaveLength(1);
  });
});

describe("claimedExemption", () => {
  test("reads the exemption kind from the PR body", () => {
    const body =
      "Moves code.\n\nExemption: refactor - existing e2e tests cover it";
    expect(claimedExemption(body)).toBe("refactor");
  });

  test("is null when the body claims none", () => {
    expect(claimedExemption("Fixes the days-left count.")).toBeNull();
  });

  test("needs a reason after the kind", () => {
    expect(claimedExemption("Exemption: refactor")).toBeNull();
  });

  test("rejects an unknown kind", () => {
    expect(() => claimedExemption("Exemption: urgent - no time")).toThrow(
      'Unknown exemption "urgent"',
    );
  });
});

describe("checkUiChangesHaveE2e", () => {
  test("passes when no UI code changed", () => {
    expect(
      checkUiChangesHaveE2e(["packages/engine/src/expiry.ts"], null),
    ).toEqual([]);
  });

  test("passes when UI code and an e2e test changed", () => {
    expect(
      checkUiChangesHaveE2e(
        ["apps/web/src/main.ts", "apps/web/e2e/first-visit.spec.ts"],
        null,
      ),
    ).toEqual([]);
  });

  test("fails when UI code changed without an e2e test", () => {
    const [problem] = checkUiChangesHaveE2e(
      ["apps/web/src/i18n/hi.ts", "packages/engine/test/expiry.test.ts"],
      null,
    );
    expect(problem).toContain("apps/web/src/i18n/hi.ts");
  });

  test("passes when the PR claims an exemption", () => {
    expect(
      checkUiChangesHaveE2e(["apps/web/src/styles.css"], "refactor"),
    ).toEqual([]);
  });

  test("treats the engine as logic, not UI: unit tests cover it", () => {
    expect(
      checkUiChangesHaveE2e(["packages/engine/src/expiry.ts"], null),
    ).toEqual([]);
  });
});

describe("checkTddCommits", () => {
  const spec = {
    subject: "docs: spec for #12",
    files: ["specs/12-spinach-first.md"],
  };
  const red = {
    subject: "test: spinach bought 4 days ago is suggested first",
    files: ["apps/web/e2e/suggestions.spec.ts"],
  };
  const green = {
    subject: "feat(suggest): rank dishes by what goes off first",
    files: ["packages/engine/src/rank.ts"],
  };

  test("accepts spec, then failing tests, then code", () => {
    expect(checkTddCommits([spec, red, green], null)).toEqual({
      problems: [],
      reviewFlags: [],
    });
  });

  test("does not apply when no app or package src/ changed", () => {
    const tooling = {
      subject: "ci: tweak workflow",
      files: [".github/workflows/ci.yml"],
    };
    expect(checkTddCommits([tooling], null).problems).toEqual([]);
  });

  test("does not apply when the PR claims an exemption", () => {
    expect(checkTddCommits([green], "refactor").problems).toEqual([]);
  });

  test("needs the failing tests committed before the code", () => {
    const { problems } = checkTddCommits([spec, green, red], null);
    expect(problems.some((p) => p.includes('No "test:" commit'))).toBe(true);
  });

  test("rejects tests and code in the same commit", () => {
    const mixed = {
      subject: "feat(suggest): rank dishes",
      files: [
        "packages/engine/src/rank.ts",
        "apps/web/e2e/suggestions.spec.ts",
      ],
    };
    const { problems } = checkTddCommits([spec, red, mixed], null);
    expect(problems.some((p) => p.includes('isn\'t a "test:" commit'))).toBe(
      true,
    );
  });

  test("flags a test changed after the code for human review", () => {
    const fixTest = {
      subject: "test: spinach keeps 5 days, not 3",
      files: ["apps/web/e2e/suggestions.spec.ts"],
    };
    const { problems, reviewFlags } = checkTddCommits(
      [spec, red, green, fixTest],
      null,
    );
    expect(problems).toEqual([]);
    expect(reviewFlags).toHaveLength(1);
    expect(reviewFlags[0]).toContain("spinach keeps 5 days, not 3");
  });
});

describe("checkTddCommits: pure functions", () => {
  test("counts the engine's code as app code, so it needs tests first too", () => {
    const lib = {
      subject: "feat: x",
      files: ["packages/engine/src/expiry.ts"],
    };
    expect(checkTddCommits([lib], null).problems).toHaveLength(1);
  });
});

describe("checkAdrChange", () => {
  const adr = (status: string, decision: string, notes = "") =>
    `# 0004. Thing\n\n- **Status:** ${status}\n\n## Context\n\nWhy.\n\n## Decision\n\n${decision}\n\n## Consequences\n\nSo.\n${notes}`;
  const path = "docs/adr/0004-thing.md";

  test("allows notes outside the Decision section", () => {
    const before = adr("Accepted", "Use X.");
    const after = adr(
      "Accepted",
      "Use X.",
      "\n## Implementation notes\n\nDone.\n",
    );
    expect(checkAdrChange(path, before, after)).toEqual([]);
  });

  test("rejects an edited decision", () => {
    const [problem] = checkAdrChange(
      path,
      adr("Accepted", "Use X."),
      adr("Accepted", "Use Y."),
    );
    expect(problem).toContain("Decision section");
  });

  test("allows marking it superseded", () => {
    const after = adr("Superseded by 0014", "Use X.");
    expect(checkAdrChange(path, adr("Accepted", "Use X."), after)).toEqual([]);
  });

  test("rejects any other status change, and deletion", () => {
    expect(
      checkAdrChange(
        path,
        adr("Accepted", "Use X."),
        adr("Proposed", "Use X."),
      ),
    ).toHaveLength(1);
    expect(checkAdrChange(path, adr("Accepted", "Use X."), null)).toHaveLength(
      1,
    );
  });

  test("proposed ADRs and new ADRs can change freely", () => {
    expect(
      checkAdrChange(
        path,
        adr("Proposed", "Use X."),
        adr("Proposed", "Use Y."),
      ),
    ).toEqual([]);
    expect(checkAdrChange(path, null, adr("Accepted", "Use X."))).toEqual([]);
  });
});

describe("linkedIssue", () => {
  test.each([
    ["Closes #12", 12],
    ["This fixes #7 for Hindi", 7],
    ["resolves #130.", 130],
    ["See #12", null],
    ["", null],
  ] as [string, number | null][])("%p links %p", (body, issue) => {
    expect(linkedIssue(body)).toBe(issue);
  });
});

describe("checkApprovedSpec", () => {
  const src = [
    "packages/engine/src/rank.ts",
    "apps/web/e2e/suggestions.spec.ts",
  ];

  test("passes when the issue's spec is already on main", () => {
    expect(
      checkApprovedSpec(src, null, 12, ["specs/12-spinach-first.md"]),
    ).toEqual([]);
  });

  test("fails when the spec is only in this PR, not approved on main", () => {
    const [problem] = checkApprovedSpec(src, null, 12, ["specs/TEMPLATE.md"]);
    expect(problem).toContain("No approved spec for #12");
  });

  test("fails when the PR links no issue", () => {
    const [problem] = checkApprovedSpec(src, null, null, []);
    expect(problem).toContain('"Closes #<issue>"');
  });

  test("does not match another issue's spec", () => {
    expect(
      checkApprovedSpec(src, null, 1, ["specs/12-spinach-first.md"]),
    ).toHaveLength(1);
  });

  test("does not apply without app or package src/ changes, or with an exemption", () => {
    expect(checkApprovedSpec(["docs/workflow.md"], null, null, [])).toEqual([]);
    expect(checkApprovedSpec(src, "refactor", null, [])).toEqual([]);
  });
});

describe("exemptionNotice", () => {
  test("asks the reviewer to check an exemption on a PR that changes app code", () => {
    expect(exemptionNotice("refactor", ["apps/web/src/main.ts"])).toContain(
      '"refactor" exemption',
    );
  });

  test("stays quiet without an exemption, or when app code is untouched", () => {
    expect(exemptionNotice(null, ["apps/web/src/main.ts"])).toBeNull();
    expect(exemptionNotice("docs", ["docs/workflow.md"])).toBeNull();
  });
});
