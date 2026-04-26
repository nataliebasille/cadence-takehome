import { isValid, parseISO } from "date-fns";
import { err, ok } from "neverthrow";
import type { ErrorDetails, NeedsFollowUpResult } from "./+types.ts";

export const RuleStatus = {
  NEEDS_FOLLOW_UP: "NEEDS_FOLLOW_UP",
  NOT_CLEARED: "NOT_CLEARED",
  READY: "READY",
} as const;

function formatRuleCode(name: string) {
  return name.toUpperCase().replace(/\s+/g, "_");
}

type RuleEvidenceEntity = {
  documentId?: string | null;
  source?: string;
  sourcePath: string;
};

export function extractEvidence(entity: {
  documentId?: string | null;
  source?: string;
  sourcePath: string;
}) {
  return {
    ...(entity.documentId !== undefined && { documentId: entity.documentId }),
    ...(entity.source !== undefined && { source: entity.source }),
    sourcePath: entity.sourcePath,
  };
}

export function pass() {
  return ok();
}

export function needsFollowUp(code: string, details: ErrorDetails) {
  return err({
    status: RuleStatus.NEEDS_FOLLOW_UP,
    code,
    details,
  });
}

export function notCleared(code: string, details: ErrorDetails) {
  return err({
    status: RuleStatus.NOT_CLEARED,
    code,
    details,
  });
}

export function parseRuleDate<T extends RuleEvidenceEntity, K extends keyof T>(
  entity: T,
  key: K,
  name: string,
): NeedsFollowUpResult<Date> {
  const missingCode = `${formatRuleCode(name)}_DATE_MISSING`;
  const invalidCode = `${formatRuleCode(name)}_DATE_INVALID`;
  const value = entity[key];

  if (value === null) {
    return needsFollowUp(missingCode, {
      issues: [`${name} date is missing`],
      evidence: [extractEvidence(entity)],
    });
  }

  if (value instanceof Date) {
    return isValid(value) ?
        ok(value)
      : needsFollowUp(invalidCode, {
          issues: [`${name} date is invalid. date = ${value.toISOString()}`],
          evidence: [extractEvidence(entity)],
        });
  }

  if (typeof value !== "string") {
    return needsFollowUp(invalidCode, {
      issues: [`${name} date is invalid. date = ${String(value)}`],
      evidence: [extractEvidence(entity)],
    });
  }

  const parsed = parseISO(value);
  return isValid(parsed) ?
      ok(parsed)
    : needsFollowUp(invalidCode, {
        issues: [`${name} date is invalid. date = ${value}`],
        evidence: [extractEvidence(entity)],
      });
}

export function requireDocumentation<T>(
  value: T | null,
  name: string,
): NeedsFollowUpResult<T> {
  if (!value) {
    return needsFollowUp(`${formatRuleCode(name)}_MISSING`, {
      issues: [`${name} documentation is missing`],
    });
  }

  return ok(value);
}
