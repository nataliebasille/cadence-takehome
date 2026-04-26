import anticoagulationPlan from "./anticoagulation-management/require-plan-if-taking-anticoagulation-medication.ts";
import historyAndPhysicalWithin30Days from "./required-documentations/require-h-and-p-within-30-days.ts";
import signedSurgicalConsent from "./required-documentations/require-signed-concent.ts";
import highRiskCbcWithin14Days from "./required-testing/high-risk-cbc-within-14-days.ts";
import highRiskCmpWithin14Days from "./required-testing/high-risk-cmp-within-14-days.ts";
import lowModerateRiskCbcWithin30Days from "./required-testing/low-moderate-risk-cbc-within-30-days.ts";
import bloodPressureInRange from "./safety-exclusion/elevated-blood-pressure.ts";
import bodyTemperatureInRange from "./safety-exclusion/high-body-temperature.ts";
import type { PreOpSchedulingRuleInput } from "../../types/pre-op-scheduling-rule-input.ts";
import type {
  RuleDefinition,
  RuleRunIssue,
  RuleOptions,
  RuleResultsByCategory,
  RulesRunnerResult,
} from "./+types.ts";
import { RuleStatus } from "./+helpers.ts";
import type {
  TriageEvidence,
  TriageIssueCategory,
} from "../../types/triage-output.ts";

export const RULES: RuleDefinition[] = [
  bloodPressureInRange,
  bodyTemperatureInRange,
  historyAndPhysicalWithin30Days,
  signedSurgicalConsent,
  highRiskCbcWithin14Days,
  highRiskCmpWithin14Days,
  lowModerateRiskCbcWithin30Days,
  anticoagulationPlan,
];

export function runPreOpSchedulingRules(
  input: PreOpSchedulingRuleInput,
  options: RuleOptions = {},
): RulesRunnerResult {
  const issues = [];
  const ruleResults: RuleResultsByCategory = {};

  for (const ruleDefinition of RULES) {
    const result = ruleDefinition.rule(input, options);
    const categoryResults = (ruleResults[ruleDefinition.category] ??= {});

    if (result.isOk()) {
      categoryResults[ruleDefinition.name] = true;
      continue;
    }

    categoryResults[ruleDefinition.name] = result.error;
    issues.push({
      ...result.error,
      rule: ruleDefinition.name,
      category: getIssueCategory(result.error.code, ruleDefinition.category),
    });
  }

  return {
    decision: decide(issues),
    issues,
    explanation: explain(issues),
    evidence: collectEvidence(issues),
    ruleResults,
  };
}

function decide(issues: RulesRunnerResult["issues"]) {
  if (issues.some((issue) => issue.status === RuleStatus.NEEDS_FOLLOW_UP)) {
    return RuleStatus.NEEDS_FOLLOW_UP;
  }

  if (issues.length > 0) {
    return RuleStatus.NOT_CLEARED;
  }

  return RuleStatus.READY;
}

function explain(issues: RuleRunIssue[]) {
  if (issues.length === 0) {
    return "READY: All pre-op scheduling requirements satisfied";
  }

  return issues
    .map((issue) => {
      const details = issue.details as { issues?: string[] };
      return `${issue.category}: ${details.issues?.[0] ?? issue.code}`;
    })
    .filter((entry, index, entries) => entries.indexOf(entry) === index)
    .join(" | ");
}

function collectEvidence(issues: RuleRunIssue[]): TriageEvidence[] {
  const seen = new Set<string>();
  const evidence: TriageEvidence[] = [];

  for (const issue of issues) {
    const details = issue.details as { evidence?: TriageEvidence[] };

    for (const item of details.evidence ?? []) {
      const key = JSON.stringify(item);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      evidence.push(item);
    }
  }

  return evidence;
}

function getIssueCategory(
  code: string,
  defaultCategory: TriageIssueCategory,
): TriageIssueCategory {
  return code.startsWith("PROCEDURE_DATE_") ?
      "MISSING_REQUIRED_DATA"
    : defaultCategory;
}
