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

const color = {
  bold: (value: string) => `\u001B[1m${value}\u001B[22m`,
  dim: (value: string) => `\u001B[2m${value}\u001B[22m`,
  green: (value: string) => `\u001B[32m${value}\u001B[39m`,
  red: (value: string) => `\u001B[31m${value}\u001B[39m`,
  yellow: (value: string) => `\u001B[33m${value}\u001B[39m`,
  cyan: (value: string) => `\u001B[36m${value}\u001B[39m`,
};

export function formatRunResult(result: RulesRunnerResult) {
  const lines = [
    color.bold("Pre-op scheduling triage"),
    "",
    `${color.bold("Decision:")} ${formatDecision(result.decision)}`,
    `${color.bold("Explanation:")} ${result.explanation}`,
    "",
    ...formatIssues(result.issues),
    "",
    ...formatEvidence(result.evidence),
    "",
    ...formatRuleResults(result.ruleResults),
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

function formatEvidence(evidence: TriageEvidence[]) {
  if (evidence.length === 0) {
    return [`${color.bold("Evidence:")} ${color.green("none")}`];
  }

  return [
    color.bold("Evidence:"),
    ...evidence.map((item) => `- ${formatEvidenceItem(item)}`),
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
