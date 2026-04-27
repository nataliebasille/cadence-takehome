import anticoagulationPlan from "./anticoagulation-management/require-plan-if-taking-anticoagulation-medication.ts";
import { isValid, parseISO } from "date-fns";
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
    evidence: collectEvidence(input),
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

function collectEvidence(input: PreOpSchedulingRuleInput): TriageEvidence[] {
  const plan = input.evidence.anticoagulationPlan;

  return [
    {
      sourcePath: input.procedure.sourcePath,
      source: [
        `procedure: ${input.procedure.type}`,
        `risk: ${input.procedure.risk}`,
        input.procedure.date ?
          `date: ${formatDate(input.procedure.date)}`
        : null,
      ]
        .filter(Boolean)
        .join("; "),
    },
    ...(input.evidence.latestBloodPressure ?
      [
        {
          sourcePath: input.evidence.latestBloodPressure.sourcePath,
          source: [
            `blood pressure: ${input.evidence.latestBloodPressure.systolic}/${input.evidence.latestBloodPressure.diastolic}`,
            `measured: ${formatDate(input.evidence.latestBloodPressure.measuredAt)}`,
            `source: ${input.evidence.latestBloodPressure.source}`,
          ].join("; "),
        },
      ]
    : []),
    ...(input.evidence.latestTemperature ?
      [
        {
          sourcePath: input.evidence.latestTemperature.sourcePath,
          source: [
            `temperature: ${input.evidence.latestTemperature.valueF} F`,
            `measured: ${formatDate(input.evidence.latestTemperature.measuredAt)}`,
            `source: ${input.evidence.latestTemperature.source}`,
          ].join("; "),
        },
      ]
    : []),
    ...formatDocumentEvidence(
      "history and physical",
      input.evidence.historyAndPhysical,
    ),
    ...formatDocumentEvidence(
      "surgical consent",
      input.evidence.surgicalConsent,
      [
        input.evidence.surgicalConsent ?
          `signed: ${String(input.evidence.surgicalConsent.isSigned)}`
        : null,
      ],
    ),
    ...formatLabEvidence(input.evidence.latestCbc),
    ...formatLabEvidence(input.evidence.latestCmp),
    ...input.evidence.activeAnticoagulants.map((medication) => ({
      sourcePath: medication.sourcePath,
      source: `active anticoagulant: ${medication.name}; value: ${medication.rawValue}`,
    })),
    ...(plan.sourcePath ?
      [
        {
          sourcePath: plan.sourcePath,
          source: [
            "anticoagulation plan",
            `present: ${String(plan.present)}`,
            `pre-procedure instructions: ${String(plan.hasPreProcedureInstruction)}`,
            `post-procedure instructions: ${String(plan.hasPostProcedureInstruction)}`,
            `documented missing/incomplete: ${String(plan.planIsDocumentedAsMissingOrIncomplete)}`,
            plan.source ? `source: ${plan.source}` : null,
          ]
            .filter(Boolean)
            .join("; "),
        },
      ]
    : []),
    ...(plan.planMissingOrIncompleteReason ?
      [
        {
          sourcePath: plan.planMissingOrIncompleteReason.sourcePath,
          source: `anticoagulation plan issue: ${plan.planMissingOrIncompleteReason.excerpt}`,
        },
      ]
    : []),
  ];
}

function formatDocumentEvidence(
  label: string,
  document: PreOpSchedulingRuleInput["evidence"]["historyAndPhysical"],
  extraDetails: Array<string | null> = [],
): TriageEvidence[] {
  if (!document) {
    return [];
  }

  return [
    {
      documentId: document.documentId,
      sourcePath: document.sourcePath,
      source: [
        label,
        `date: ${document.date ? formatDate(document.date) : "missing"}`,
        `source: ${document.source}`,
        ...extraDetails,
      ]
        .filter(Boolean)
        .join("; "),
    },
  ];
}

function formatLabEvidence(
  lab: PreOpSchedulingRuleInput["evidence"]["latestCbc"],
): TriageEvidence[] {
  if (!lab) {
    return [];
  }

  return [
    {
      documentId: lab.labId,
      sourcePath: lab.sourcePath,
      source: [
        lab.code,
        lab.rawValue,
        `effective: ${lab.effectiveAt ? formatDate(lab.effectiveAt) : "missing"}`,
        lab.status ? `status: ${lab.status}` : null,
        `source: ${lab.source}`,
      ]
        .filter(Boolean)
        .join("; "),
    },
  ];
}

function formatDate(value: Date | string) {
  if (value instanceof Date) {
    return isValid(value) ? value.toISOString() : String(value);
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed.toISOString() : value;
}

function getIssueCategory(
  code: string,
  defaultCategory: TriageIssueCategory,
): TriageIssueCategory {
  return code.startsWith("PROCEDURE_DATE_") ?
      "MISSING_REQUIRED_DATA"
    : defaultCategory;
}
