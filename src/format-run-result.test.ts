import { describe, expect, it } from "vitest";
import { formatRunResult } from "./format-run-result.ts";
import type { RulesRunnerResult } from "./engine/rules/+types.ts";

describe("formatRunResult", () => {
  it("prints gathered evidence with clinical labels and findings at the end", () => {
    const result: RulesRunnerResult = {
      decision: "NEEDS_FOLLOW_UP",
      explanation:
        "ACUTE_SAFETY_EXCLUSION: blood pressure and temperature require follow-up",
      evidence: [
        {
          sourcePath: "vitals[0]",
          source: "Pre-op clinic",
        },
        {
          sourcePath: "vitals[1]",
          source: "Pre-op clinic",
        },
        {
          sourcePath: "medications[0]",
          source: "warfarin 5 mg daily",
        },
        {
          sourcePath: "documents.anticoagulationPlan",
          source: "Medication plan note",
        },
      ],
      issues: [
        {
          status: "NOT_CLEARED",
          category: "ACUTE_SAFETY_EXCLUSION",
          rule: "Patient has blood pressure within acceptable range for surgery",
          code: "BLOOD_PRESSURE_TOO_HIGH",
          details: {
            issues: [
              "Patient's blood pressure is critically high and requires medical clearance before proceeding with surgery.",
              "Systolic: 180; Threshold: 180",
            ],
            evidence: [
              {
                sourcePath: "vitals[0]",
                source: "Pre-op clinic",
              },
            ],
          },
        },
        {
          status: "NEEDS_FOLLOW_UP",
          category: "ACUTE_SAFETY_EXCLUSION",
          rule: "Patient has a normal fever for surgery",
          code: "ELEVATED_BODY_TEMPERATURE",
          details: {
            issues: [
              "Patient's latest body temperature is 100.5 F, which is above the fever threshold of 100.4 F.",
            ],
            evidence: [
              {
                sourcePath: "vitals[1]",
                source: "Pre-op clinic",
              },
            ],
          },
        },
        {
          status: "NEEDS_FOLLOW_UP",
          category: "ANTICOAGULATION_MANAGEMENT",
          rule: "Patients taking anticoagulation medication require a complete perioperative management plan",
          code: "ANTICOAGULATION_MANAGEMENT_PLAN_INCOMPLETE",
          details: {
            issues: [
              "A documented perioperative anticoagulation management plan is required for patients taking anticoagulants.",
            ],
            evidence: [
              {
                sourcePath: "medications[0]",
                source: "warfarin 5 mg daily",
              },
              {
                sourcePath: "documents.anticoagulationPlan",
                source: "Medication plan note",
              },
            ],
            additionalDetails: {
              activeAnticoagulants: ["warfarin"],
              anticoagulationPlan: {
                present: false,
                hasPreProcedureInstruction: false,
                hasPostProcedureInstruction: false,
                planIsDocumentedAsMissingOrIncomplete: true,
              },
            },
          },
        },
      ],
      ruleResults: {
        ACUTE_SAFETY_EXCLUSION: {
          "Patient has blood pressure within acceptable range for surgery": {
            status: "NOT_CLEARED",
            code: "BLOOD_PRESSURE_TOO_HIGH",
            details: {},
          },
          "Patient has a normal fever for surgery": {
            status: "NEEDS_FOLLOW_UP",
            code: "ELEVATED_BODY_TEMPERATURE",
            details: {},
          },
        },
        ANTICOAGULATION_MANAGEMENT: {
          "Patients taking anticoagulation medication require a complete perioperative management plan":
            {
              status: "NEEDS_FOLLOW_UP",
              code: "ANTICOAGULATION_MANAGEMENT_PLAN_INCOMPLETE",
              details: {},
            },
        },
      },
    };

    const output = stripAnsi(formatRunResult(result));

    expect(output).toContain("Evidence gathered (4):");
    expect(output).toContain(
      "1. Blood pressure: vitals[0] | source: Pre-op clinic (Patient's blood pressure is critically high and requires medical clearance before proceeding with surgery.; Systolic: 180; Threshold: 180)",
    );
    expect(output).toContain(
      "2. Temperature: vitals[1] | source: Pre-op clinic (Patient's latest body temperature is 100.5 F, which is above the fever threshold of 100.4 F.)",
    );
    expect(output).toContain(
      "3. Active anticoagulant: medications[0] | source: warfarin 5 mg daily",
    );
    expect(output).toContain("active anticoagulants: warfarin");
    expect(output).toContain(
      "4. Anticoagulation plan: documents.anticoagulationPlan | source: Medication plan note",
    );
    expect(output).toContain(
      "plan present: false; pre-procedure instructions: false; post-procedure instructions: false; documented missing/incomplete: true",
    );
    expect(output.indexOf("Rule results:")).toBeLessThan(
      output.indexOf("Evidence gathered (4):"),
    );
  });

  it("labels gathered CBC evidence", () => {
    const result: RulesRunnerResult = {
      decision: "NEEDS_FOLLOW_UP",
      explanation: "REQUIRED_TESTING: CBC must be repeated before surgery",
      evidence: [
        {
          sourcePath: "evidence.latestCbc",
          source: "lab",
          documentId: "cbc-1",
        },
      ],
      issues: [
        {
          status: "NEEDS_FOLLOW_UP",
          category: "REQUIRED_TESTING",
          rule: "high-risk-cbc-within-14-days",
          code: "CBC_TOO_OLD",
          details: {
            issues: ["CBC must be repeated before surgery"],
            evidence: [
              {
                sourcePath: "evidence.latestCbc",
                source: "lab",
                documentId: "cbc-1",
              },
            ],
          },
        },
      ],
      ruleResults: {
        REQUIRED_TESTING: {
          "high-risk-cbc-within-14-days": {
            status: "NEEDS_FOLLOW_UP",
            code: "CBC_TOO_OLD",
            details: {},
          },
        },
      },
    };

    const output = stripAnsi(formatRunResult(result));

    expect(output).toContain("Evidence gathered (1):");
    expect(output).toContain(
      "1. CBC: evidence.latestCbc | source: lab | document: cbc-1 (CBC must be repeated before surgery)",
    );
  });
});

function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}
