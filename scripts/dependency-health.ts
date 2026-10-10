// ADR 0006 health thresholds as a pure function, so they have unit tests.
// scripts/check-dependency-health.ts gathers the facts and runs this.

export interface PackageFacts {
  name: string;
  version: string;
  /** OpenSSF Scorecard of the source repo; null when none is published. */
  scorecard: number | null;
  /** ISO date of the package's most recent release (any version). */
  lastRelease: string;
  maintainers: number;
  installScripts: string[];
  license: string | null;
  provenance: boolean;
  /** Packages this one pulls in, not counting itself; null when unknown. */
  transitive: number | null;
}

/** Checks that fail unless the allowlist records an exception for them. */
export const FAILING_CHECKS = [
  "scorecard",
  "recent-release",
  "maintainers",
  "install-scripts",
  "license",
] as const;
export type FailingCheck = (typeof FAILING_CHECKS)[number];

export const ALLOWED_LICENSES = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
];

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** A licence string is allowed when it, or any "OR" alternative, is. */
function licenseAllowed(license: string | null): boolean {
  if (!license) return false;
  return license
    .replace(/[()]/g, "")
    .split(/\s+OR\s+/)
    .some((l) => ALLOWED_LICENSES.includes(l.trim()));
}

function failedChecks(f: PackageFacts, now: Date): Map<FailingCheck, string> {
  const failed = new Map<FailingCheck, string>();
  if (f.scorecard === null)
    failed.set("scorecard", "no OpenSSF Scorecard published");
  else if (f.scorecard < 5)
    failed.set("scorecard", `OpenSSF Scorecard ${f.scorecard} is below 5`);
  if (now.getTime() - new Date(f.lastRelease).getTime() > YEAR_MS) {
    failed.set(
      "recent-release",
      `last release ${f.lastRelease.slice(0, 10)} is over 12 months ago`,
    );
  }
  if (f.maintainers < 2)
    failed.set(
      "maintainers",
      `${f.maintainers} npm maintainer(s), needs 2 or more`,
    );
  if (f.installScripts.length > 0) {
    failed.set(
      "install-scripts",
      `has install scripts: ${f.installScripts.join(", ")}`,
    );
  }
  if (!licenseAllowed(f.license)) {
    failed.set(
      "license",
      `licence ${f.license ?? "unknown"} is not one of ${ALLOWED_LICENSES.join(", ")}`,
    );
  }
  return failed;
}

export interface HealthResult {
  failures: string[];
  warnings: string[];
  /** Exceptions that cover a check this version passes; can be removed. */
  unusedExceptions: string[];
}

export function evaluateHealth(
  facts: PackageFacts,
  exceptions: Partial<Record<string, string>>,
  now: Date,
): HealthResult {
  const id = `${facts.name}@${facts.version}`;
  const failed = failedChecks(facts, now);
  const result: HealthResult = {
    failures: [],
    warnings: [],
    unusedExceptions: [],
  };
  for (const [check, why] of failed) {
    if (exceptions[check])
      result.warnings.push(`${id}: ${why} (allowed by exception)`);
    else result.failures.push(`${id}: ${why} [${check}]`);
  }
  for (const check of Object.keys(exceptions)) {
    if (!failed.has(check as FailingCheck))
      result.unusedExceptions.push(
        `${id}: exception for "${check}" is no longer needed`,
      );
  }
  if (!facts.provenance)
    result.warnings.push(`${id}: no npm provenance attestation`);
  if (facts.transitive === null)
    result.warnings.push(`${id}: transitive package count unavailable`);
  else if (facts.transitive > 20)
    result.warnings.push(
      `${id}: adds ${facts.transitive} transitive packages (more than 20)`,
    );
  return result;
}
