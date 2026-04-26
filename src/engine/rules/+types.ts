import type { Result } from "neverthrow";
import type { PreOpSchedulingTriagerOptions } from "../engine-options.ts";
import type { PreOpSchedulingRuleInput } from "../../types/pre-op-scheduling-rule-input.ts";
import type {
  TriageDecision,
  TriageEvidence,
  TriageIssueCategory,
} from "../../types/triage-output.ts";
import type { extractEvidence } from "./+helpers.ts";

export type RuleFailure = {
  status: "NEEDS_FOLLOW_UP" | "NOT_CLEARED";
  code: string;
  details: unknown;
};

export type RuleOutput = Result<void, RuleFailure>;

export type RuleOptions = Partial<PreOpSchedulingTriagerOptions>;

export type Rule = (
  input: PreOpSchedulingRuleInput,
  options: RuleOptions,
) => RuleOutput;

export type RuleDefinition = {
  name: string;
  category: TriageIssueCategory;
  rule: Rule;
};

export type RuleRunIssue = RuleFailure & {
  rule: string;
  category: TriageIssueCategory;
};

export type RuleResultsByCategory = Partial<
  Record<TriageIssueCategory, Record<string, true | RuleFailure>>
>;

export type RulesRunnerResult = {
  decision: TriageDecision;
  issues: RuleRunIssue[];
  explanation: string;
  evidence: TriageEvidence[];
  ruleResults: RuleResultsByCategory;
};

export type RuleStatus = "NEEDS_FOLLOW_UP" | "NOT_CLEARED" | "READY";
export type RuleFailureStatus = Exclude<RuleStatus, "READY">;

export type ErrorDetails = {
  evidence?: ReturnType<typeof extractEvidence>[];
  issues: string[];
  additionalDetails?: unknown;
};

export type NeedsFollowUpResult<T> = Result<
  T,
  {
    status: "NEEDS_FOLLOW_UP";
    code: string;
    details: ErrorDetails;
  }
>;
