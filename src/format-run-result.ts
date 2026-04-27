import type {
  RuleFailure,
  RuleRunIssue,
  RulesRunnerResult,
} from "./engine/rules/+types.ts";
import type { TriageEvidence } from "./types/triage-output.ts";

type IssueDetails = {
  evidence?: TriageEvidence[];
  issues?: string[];
  additionalDetails?: unknown;
};

type EvidenceSummary = {
  label: string;
  details: string[];
};

type FormatRunResultOptions = {
  patientName?: string;
};

const color = {
  bold: (value: string) => `\u001B[1m${value}\u001B[22m`,
  dim: (value: string) => `\u001B[2m${value}\u001B[22m`,
  green: (value: string) => `\u001B[32m${value}\u001B[39m`,
  red: (value: string) => `\u001B[31m${value}\u001B[39m`,
  yellow: (value: string) => `\u001B[33m${value}\u001B[39m`,
  cyan: (value: string) => `\u001B[36m${value}\u001B[39m`,
};

export function formatRunResult(
  result: RulesRunnerResult,
  options: FormatRunResultOptions = {},
) {
  const lines = [
    color.bold("Pre-op scheduling triage"),
    ...(options.patientName ?
      ["", `${color.bold("PATIENT:")} ${color.cyan(options.patientName)}`]
    : []),
    "",
    `${color.bold("Decision:")} ${formatDecision(result.decision)}`,
    `${color.bold("Explanation:")} ${result.explanation}`,
    "",
    ...formatIssues(result.issues),
    "",
    ...formatRuleResults(result.ruleResults),
    "",
    ...formatEvidence(result),
  ];

  return lines.join("\n").trimEnd();
}

function formatIssues(issues: RuleRunIssue[]) {
  if (issues.length === 0) {
    return [`${color.bold("Issues:")} ${color.green("none")}`];
  }

  return [
    color.bold(`Issues (${issues.length}):`),
    ...issues.flatMap((issue, index) => {
      const details = issue.details as IssueDetails;
      const issueLines = details.issues ?? [issue.code];

      return [
        `${index + 1}. ${color.cyan(issue.category)} - ${formatDecision(issue.status)}`,
        `   ${color.dim("Rule:")} ${issue.rule}`,
        `   ${color.dim("Code:")} ${issue.code}`,
        ...issueLines.map((line) => `   - ${line}`),
        ...formatNestedEvidence(details.evidence),
        ...formatAdditionalDetails(details.additionalDetails),
      ];
    }),
  ];
}

function formatEvidence(result: RulesRunnerResult) {
  if (result.evidence.length === 0) {
    return [`${color.bold("Evidence:")} ${color.green("none")}`];
  }

  const summariesByEvidence = getEvidenceSummariesByEvidence(result.issues);

  return [
    color.bold(`Evidence gathered (${result.evidence.length}):`),
    ...result.evidence.flatMap((item, index) => [
      `${index + 1}. ${formatEvidenceSummary(item, summariesByEvidence.get(item.sourcePath))}`,
    ]),
  ];
}

function formatNestedEvidence(evidence?: TriageEvidence[]) {
  if (!evidence || evidence.length === 0) {
    return [];
  }

  return [
    `   ${color.dim("Evidence:")}`,
    ...evidence.map((item) => `   - ${formatEvidenceItem(item)}`),
  ];
}

function formatEvidenceItem(item: TriageEvidence) {
  const parts = [
    item.sourcePath,
    item.source ? `source: ${item.source}` : undefined,
    item.documentId ? `document: ${item.documentId}` : undefined,
  ].filter(Boolean);

  return parts.join(" | ");
}

function getEvidenceSummariesByEvidence(issues: RuleRunIssue[]) {
  const summariesByEvidence = new Map<string, EvidenceSummary>();

  for (const issue of issues) {
    const details = issue.details as IssueDetails;

    for (const item of details.evidence ?? []) {
      const summary = summariesByEvidence.get(item.sourcePath) ?? {
        label: formatEvidenceLabel(item, issue),
        details: [],
      };

      for (const detail of formatEvidenceDetails(item, issue, details)) {
        if (!summary.details.includes(detail)) {
          summary.details.push(detail);
        }
      }

      summariesByEvidence.set(item.sourcePath, summary);
    }
  }

  return summariesByEvidence;
}

function formatEvidenceSummary(
  item: TriageEvidence,
  summary?: EvidenceSummary,
) {
  const label = summary?.label ?? formatEvidenceLabel(item);
  const details = summary?.details ?? [];
  const formattedDetails = details.length > 0 ? ` (${details.join("; ")})` : "";

  return `${color.cyan(label)}: ${formatEvidenceItem(item)}${formattedDetails}`;
}

function formatEvidenceLabel(item: TriageEvidence, issue?: RuleRunIssue) {
  const searchableText = [
    item.sourcePath,
    item.source,
    item.documentId,
    issue?.code,
    issue?.rule,
    issue?.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    searchableText.includes("blood_pressure") ||
    searchableText.includes("blood pressure")
  ) {
    return "Blood pressure";
  }

  if (searchableText.includes("temperature")) {
    return "Temperature";
  }

  if (searchableText.includes("cbc")) {
    return "CBC";
  }

  if (searchableText.includes("cmp")) {
    return "CMP";
  }

  if (
    searchableText.includes("history_and_physical") ||
    searchableText.includes("history and physical") ||
    searchableText.includes("h-and-p")
  ) {
    return "History and physical";
  }

  if (searchableText.includes("consent")) {
    return "Surgical consent";
  }

  if (
    searchableText.includes("medication") ||
    searchableText.includes("anticoag")
  ) {
    return item.sourcePath.includes("medications") ?
        "Active anticoagulant"
      : "Anticoagulation plan";
  }

  if (searchableText.includes("procedure")) {
    return "Procedure";
  }

  return "Evidence";
}

function formatEvidenceDetails(
  item: TriageEvidence,
  issue: RuleRunIssue,
  details: IssueDetails,
) {
  const detailLines = [...(details.issues ?? [])];

  if (issue.category === "ANTICOAGULATION_MANAGEMENT") {
    detailLines.push(...formatAnticoagulationDetails(item, details));
  }

  return detailLines;
}

function formatAnticoagulationDetails(
  item: TriageEvidence,
  details: IssueDetails,
) {
  const additionalDetails = details.additionalDetails;

  if (!isRecord(additionalDetails)) {
    return [];
  }

  if (
    item.sourcePath.includes("medications") &&
    Array.isArray(additionalDetails.activeAnticoagulants)
  ) {
    return [
      `active anticoagulants: ${additionalDetails.activeAnticoagulants.join(", ")}`,
    ];
  }

  const plan = additionalDetails.anticoagulationPlan;
  if (!isRecord(plan)) {
    return [];
  }

  return [
    `plan present: ${String(plan.present)}`,
    `pre-procedure instructions: ${String(plan.hasPreProcedureInstruction)}`,
    `post-procedure instructions: ${String(plan.hasPostProcedureInstruction)}`,
    `documented missing/incomplete: ${String(plan.planIsDocumentedAsMissingOrIncomplete)}`,
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatAdditionalDetails(additionalDetails: unknown) {
  if (additionalDetails === undefined) {
    return [];
  }

  return [
    `   ${color.dim("Details:")}`,
    ...JSON.stringify(additionalDetails, null, 2)
      .split("\n")
      .map((line) => `   ${line}`),
  ];
}

function formatRuleResults(result: RulesRunnerResult["ruleResults"]) {
  const entries = Object.entries(result);

  if (entries.length === 0) {
    return [`${color.bold("Rule results:")} ${color.green("none")}`];
  }

  return [
    color.bold("Rule results:"),
    ...entries.flatMap(([category, rules]) => [
      `${color.cyan(category)}:`,
      ...Object.entries(rules).map(([rule, outcome]) =>
        outcome === true ?
          `  ${color.green("PASS")} ${rule}`
        : `  ${color.red("FAIL")} ${rule} (${formatRuleFailure(outcome)})`,
      ),
    ]),
  ];
}

function formatRuleFailure(failure: RuleFailure) {
  return `${formatDecision(failure.status)}: ${failure.code}`;
}

function formatDecision(decision: RulesRunnerResult["decision"]) {
  if (decision === "READY") {
    return color.green(decision);
  }

  if (decision === "NOT_CLEARED") {
    return color.red(decision);
  }

  return color.yellow(decision);
}
