import { describe, expect, it } from "vitest";
import { runPreOpSchedulingRules } from "./runner.ts";
import type { RuleRunIssue, RulesRunnerResult } from "./+types.ts";
import type { PreOpSchedulingRuleInput } from "../../types/pre-op-scheduling-rule-input.ts";

type Evidence = {
  documentId?: string | null;
  source?: string;
  sourcePath: string;
};

type IssueDetails = {
  evidence?: Evidence[];
  issues: string[];
  additionalDetails?: unknown;
};

describe("pre-op scheduling rules runner", () => {
  it("returns READY when every PDF rule is satisfied", () => {
    expectReady(run());
  });

  it("keeps NEEDS_FOLLOW_UP as the overall decision when follow-up and not-cleared issues both exist", () => {
    const result = run((input) => {
      input.evidence.latestTemperature = null;
      input.evidence.latestBloodPressure!.systolic = 180;
    });

    expect(result.decision).toBe("NEEDS_FOLLOW_UP");
    expect(result.issues.map(({ code, status }) => ({ code, status }))).toEqual(
      [
        { code: "BLOOD_PRESSURE_TOO_HIGH", status: "NOT_CLEARED" },
        {
          code: "LATEST_BODY_TEMPERATURE_MISSING",
          status: "NEEDS_FOLLOW_UP",
        },
      ],
    );
  });

  it("returns PDF-facing explanation and top-level evidence", () => {
    const result = run((input) => {
      input.procedure.date = null;
      setActiveAnticoagulant(input);
    });

    expect(result.explanation).toContain(
      "MISSING_REQUIRED_DATA: Procedure date is missing",
    );
    expect(result.explanation).toContain(
      "ANTICOAGULATION_MANAGEMENT: A documented perioperative anticoagulation management plan is required for patients taking anticoagulants.",
    );
    expect(result.evidence).toContainEqual({ sourcePath: "procedures[0]" });
    expect(result.evidence).toContainEqual({
      sourcePath: "medications[0]",
      source: "warfarin 5 mg daily",
    });
  });

  describe("acute safety exclusions", () => {
    it("requires a latest blood pressure reading", () => {
      const result = run((input) => {
        input.evidence.latestBloodPressure = null;
      });

      const issue = expectOnlyIssue(
        result,
        "LATEST_BLOOD_PRESSURE_READING_MISSING",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issue.status).toBe("NEEDS_FOLLOW_UP");
      expect(issue.category).toBe("ACUTE_SAFETY_EXCLUSION");
    });

    it("does not clear blood pressure at or above 180 systolic or 110 diastolic and includes reading evidence", () => {
      const result = run((input) => {
        input.evidence.latestBloodPressure!.systolic = 180;
        input.evidence.latestBloodPressure!.diastolic = 110;
      });

      const issue = expectOnlyIssue(result, "BLOOD_PRESSURE_TOO_HIGH");
      expect(result.decision).toBe("NOT_CLEARED");
      expect(issue.status).toBe("NOT_CLEARED");
      expect(issueDetails(issue).evidence).toEqual([
        { source: "Pre-op clinic", sourcePath: "vitals[0]" },
      ]);
    });

    it("allows blood pressure below both thresholds", () => {
      expectReady(
        run((input) => {
          input.evidence.latestBloodPressure!.systolic = 179;
          input.evidence.latestBloodPressure!.diastolic = 109;
        }),
      );
    });

    it("requires a latest body temperature reading", () => {
      const result = run((input) => {
        input.evidence.latestTemperature = null;
      });

      const issue = expectOnlyIssue(result, "LATEST_BODY_TEMPERATURE_MISSING");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issue.status).toBe("NEEDS_FOLLOW_UP");
    });

    it("requires follow-up for fever above 100.4 F and includes temperature evidence", () => {
      const result = run((input) => {
        input.evidence.latestTemperature!.valueF = 100.5;
      });

      const issue = expectOnlyIssue(result, "ELEVATED_BODY_TEMPERATURE");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issue.status).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        { source: "Pre-op clinic", sourcePath: "vitals[1]" },
      ]);
    });

    it("allows temperature exactly at the 100.4 F fever threshold", () => {
      expectReady(
        run((input) => {
          input.evidence.latestTemperature!.valueF = 100.4;
        }),
      );
    });
  });

  describe("required documentation", () => {
    it("requires a history and physical document", () => {
      const result = run((input) => {
        input.evidence.historyAndPhysical = null;
      });

      const issue = expectOnlyIssue(result, "HISTORY_AND_PHYSICAL_MISSING");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issue.category).toBe("REQUIRED_DOCUMENTATION");
    });

    it("requires a procedure date before validating history and physical timing and includes procedure evidence", () => {
      const result = run((input) => {
        input.procedure.date = null;
      });

      const issue = issueByCode(result, "PROCEDURE_DATE_MISSING");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toContainEqual({
        sourcePath: "procedures[0]",
      });
    });

    it("requires a history and physical date and includes document evidence", () => {
      const result = run((input) => {
        input.evidence.historyAndPhysical!.date = null;
      });

      const issue = expectOnlyIssue(
        result,
        "HISTORY_AND_PHYSICAL_DATE_MISSING",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        {
          documentId: "doc-hp-1",
          source: "Surgeon H&P",
          sourcePath: "documents[0]",
        },
      ]);
    });

    it("requires follow-up when history and physical is older than 30 days and includes H&P and procedure evidence", () => {
      const result = run((input) => {
        input.evidence.historyAndPhysical!.date = calendarDate("2026-05-30");
      });

      const issue = expectOnlyIssue(
        result,
        "HISTORY_AND_PHYSICAL_OUTSIDE_30_DAY_WINDOW",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        {
          documentId: "doc-hp-1",
          source: "Surgeon H&P",
          sourcePath: "documents[0]",
        },
        { sourcePath: "procedures[0]" },
      ]);
    });

    it("requires follow-up when history and physical is after the procedure date", () => {
      const result = run((input) => {
        input.evidence.historyAndPhysical!.date = calendarDate("2026-07-01");
      });

      expectOnlyIssue(result, "HISTORY_AND_PHYSICAL_OUTSIDE_30_DAY_WINDOW");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
    });

    it("allows history and physical on the procedure date and exactly 30 days before", () => {
      expectReady(
        run((input) => {
          input.evidence.historyAndPhysical!.date =
            calendarDate("2026-06-30");
        }),
      );
      expectReady(
        run((input) => {
          input.evidence.historyAndPhysical!.date =
            calendarDate("2026-05-31");
        }),
      );
    });

    it("requires a signed surgical consent document", () => {
      const result = run((input) => {
        input.evidence.surgicalConsent = null;
      });

      const issue = expectOnlyIssue(result, "SIGNED_SURGICAL_CONSENT_MISSING");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issue.category).toBe("REQUIRED_DOCUMENTATION");
    });

    it("requires follow-up for unsigned consent and includes consent evidence", () => {
      const result = run((input) => {
        input.evidence.surgicalConsent!.isSigned = false;
      });

      const issue = expectOnlyIssue(
        result,
        "SIGNED_SURGICAL_CONSENT_NOT_SIGNED",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        {
          documentId: "doc-consent-1",
          source: "Consent form",
          sourcePath: "documents[1]",
        },
      ]);
    });
  });

  describe("required testing", () => {
    it.each(["LOW", "MODERATE"] as const)(
      "requires CBC data for %s risk procedures",
      (risk) => {
        const result = run((input) => {
          input.procedure.risk = risk;
          input.evidence.latestCbc = null;
        });

        const issue = expectOnlyIssue(result, "CBC_DATA_MISSING");
        expect(result.decision).toBe("NEEDS_FOLLOW_UP");
        expect(issue.category).toBe("REQUIRED_TESTING");
      },
    );

    it.each(["LOW", "MODERATE"] as const)(
      "requires CBC within 30 days for %s risk procedures and includes lab and procedure evidence",
      (risk) => {
        const result = run((input) => {
          input.procedure.risk = risk;
          input.evidence.latestCbc!.effectiveAt = new Date(
            "2026-05-30T08:00:00.000Z",
          );
        });

        const issue = expectOnlyIssue(
          result,
          `${risk}_PROCEDURE_CBC_OUTSIDE_30_DAY_WINDOW`,
        );
        expect(result.decision).toBe("NEEDS_FOLLOW_UP");
        expect(issueDetails(issue).evidence).toEqual([
          { source: "Core Lab", sourcePath: "labs[0]" },
          { sourcePath: "procedures[0]" },
        ]);
      },
    );

    it.each(["LOW", "MODERATE"] as const)(
      "allows CBC exactly 30 days before the procedure for %s risk procedures",
      (risk) => {
        expectReady(
          run((input) => {
            input.procedure.risk = risk;
            input.evidence.latestCbc!.effectiveAt = new Date(
              "2026-05-31T08:00:00.000Z",
            );
          }),
        );
      },
    );

    it("requires high-risk CBC data", () => {
      const result = run((input) => {
        setHighRisk(input);
        input.evidence.latestCbc = null;
      });

      expectOnlyIssue(result, "CBC_DATA_MISSING");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
    });

    it("requires high-risk CBC within 14 days and includes lab and procedure evidence", () => {
      const result = run((input) => {
        setHighRisk(input);
        input.evidence.latestCbc!.effectiveAt = new Date(
          "2026-06-15T08:00:00.000Z",
        );
      });

      const issue = expectOnlyIssue(
        result,
        "HIGH_PROCEDURE_CBC_OUTSIDE_14_DAY_WINDOW",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        { source: "Core Lab", sourcePath: "labs[0]" },
        { sourcePath: "procedures[0]" },
      ]);
    });

    it("allows high-risk CBC exactly 14 days before the procedure", () => {
      expectReady(
        run((input) => {
          setHighRisk(input);
          input.evidence.latestCbc!.effectiveAt = new Date(
            "2026-06-16T08:00:00.000Z",
          );
        }),
      );
    });

    it("requires high-risk CMP data", () => {
      const result = run((input) => {
        setHighRisk(input);
        input.evidence.latestCmp = null;
      });

      expectOnlyIssue(result, "LATEST_CMP_RESULT_MISSING");
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
    });

    it("requires high-risk CMP within 14 days and includes lab and procedure evidence", () => {
      const result = run((input) => {
        setHighRisk(input);
        input.evidence.latestCmp!.effectiveAt = new Date(
          "2026-06-15T08:00:00.000Z",
        );
      });

      const issue = expectOnlyIssue(
        result,
        "HIGH_PROCEDURE_CMP_OUTSIDE_14_DAY_WINDOW",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        { source: "Core Lab", sourcePath: "labs[1]" },
        { sourcePath: "procedures[0]" },
      ]);
    });

    it("allows high-risk CMP exactly 14 days before the procedure", () => {
      expectReady(
        run((input) => {
          setHighRisk(input);
          input.evidence.latestCmp!.effectiveAt = new Date(
            "2026-06-16T08:00:00.000Z",
          );
        }),
      );
    });

    it("requires follow-up when CBC or CMP dates are missing and includes the lab evidence", () => {
      const cbcResult = run((input) => {
        input.evidence.latestCbc!.effectiveAt = null;
      });
      const cbcIssue = expectOnlyIssue(cbcResult, "CBC_DATE_MISSING");
      expect(issueDetails(cbcIssue).evidence).toEqual([
        { source: "Core Lab", sourcePath: "labs[0]" },
      ]);

      const cmpResult = run((input) => {
        setHighRisk(input);
        input.evidence.latestCmp!.effectiveAt = null;
      });
      const cmpIssue = expectOnlyIssue(cmpResult, "CMP_DATE_MISSING");
      expect(issueDetails(cmpIssue).evidence).toEqual([
        { source: "Core Lab", sourcePath: "labs[1]" },
      ]);
    });

    it("requires follow-up when required tests are dated after the procedure", () => {
      const lowRiskResult = run((input) => {
        input.evidence.latestCbc!.effectiveAt = new Date(
          "2026-07-01T08:00:00.000Z",
        );
      });
      expectOnlyIssue(
        lowRiskResult,
        "LOW_PROCEDURE_CBC_OUTSIDE_30_DAY_WINDOW",
      );

      const highRiskResult = run((input) => {
        setHighRisk(input);
        input.evidence.latestCmp!.effectiveAt = new Date(
          "2026-07-01T08:00:00.000Z",
        );
      });
      expectOnlyIssue(
        highRiskResult,
        "HIGH_PROCEDURE_CMP_OUTSIDE_14_DAY_WINDOW",
      );
    });
  });

  describe("anticoagulation management", () => {
    it("does not require a plan when there are no active anticoagulants", () => {
      expectReady(
        run((input) => {
          input.evidence.anticoagulationPlan.planIsDocumentedAsMissingOrIncomplete =
            true;
        }),
      );
    });

    it("requires a complete plan for active anticoagulants and includes medication evidence", () => {
      const result = run(setActiveAnticoagulant);

      const issue = expectOnlyIssue(
        result,
        "ANTICOAGULATION_MANAGEMENT_PLAN_INCOMPLETE",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issue.category).toBe("ANTICOAGULATION_MANAGEMENT");
      expect(issueDetails(issue).evidence).toEqual([
        { source: "warfarin 5 mg daily", sourcePath: "medications[0]" },
      ]);
      expect(issueDetails(issue).additionalDetails).toMatchObject({
        activeAnticoagulants: ["warfarin"],
        anticoagulationPlan: {
          present: false,
          hasPreProcedureInstruction: false,
          hasPostProcedureInstruction: false,
          planIsDocumentedAsMissingOrIncomplete: false,
        },
      });
    });

    it("requires both pre- and post-procedure instructions when the plan is present", () => {
      const result = run((input) => {
        setActiveAnticoagulant(input);
        input.evidence.anticoagulationPlan = {
          ...input.evidence.anticoagulationPlan,
          present: true,
          source: "Cardiology note",
          date: calendarDate("2026-06-20"),
          excerpt: "Hold warfarin before procedure.",
          sourcePath: "documents[2]",
          rawText: "Hold warfarin before procedure.",
          mentionsMedicationNames: ["warfarin"],
          hasPreProcedureInstruction: true,
          hasPostProcedureInstruction: false,
        };
      });

      const issue = expectOnlyIssue(
        result,
        "ANTICOAGULATION_MANAGEMENT_PLAN_INCOMPLETE",
      );
      expect(result.decision).toBe("NEEDS_FOLLOW_UP");
      expect(issueDetails(issue).evidence).toEqual([
        { source: "warfarin 5 mg daily", sourcePath: "medications[0]" },
        { source: "Cardiology note", sourcePath: "documents[2]" },
      ]);
      expect(issueDetails(issue).issues).toHaveLength(1);
    });

    it("includes the documented missing-or-incomplete reason as evidence", () => {
      const result = run((input) => {
        setActiveAnticoagulant(input);
        input.evidence.anticoagulationPlan = {
          ...input.evidence.anticoagulationPlan,
          present: true,
          source: "Packet note",
          sourcePath: "documents[3]",
          planIsDocumentedAsMissingOrIncomplete: true,
          planMissingOrIncompleteReason: {
            excerpt: "No restart instructions are documented.",
            sourcePath: "documents[3].text",
          },
        };
      });

      const issue = expectOnlyIssue(
        result,
        "ANTICOAGULATION_MANAGEMENT_PLAN_INCOMPLETE",
      );
      expect(issueDetails(issue).evidence).toEqual([
        { source: "warfarin 5 mg daily", sourcePath: "medications[0]" },
        { source: "Packet note", sourcePath: "documents[3]" },
        {
          source: "No restart instructions are documented.",
          sourcePath: "documents[3].text",
        },
      ]);
    });

    it("allows a complete anticoagulation management plan", () => {
      expectReady(
        run((input) => {
          setActiveAnticoagulant(input);
          input.evidence.anticoagulationPlan = {
            ...input.evidence.anticoagulationPlan,
            present: true,
            source: "Cardiology note",
            date: calendarDate("2026-06-20"),
            excerpt: "Hold warfarin before surgery and restart afterward.",
            sourcePath: "documents[2]",
            rawText: "Hold warfarin before surgery and restart afterward.",
            mentionsMedicationNames: ["warfarin"],
            hasPreProcedureInstruction: true,
            hasPostProcedureInstruction: true,
          };
        }),
      );
    });
  });
});

function calendarDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function makeInput(
  mutate?: (input: PreOpSchedulingRuleInput) => void,
): PreOpSchedulingRuleInput {
  const input: PreOpSchedulingRuleInput = {
    patient: {
      id: "patient-1",
      mrn: "MRN-1",
      dob: "1970-01-01",
      sex: "F",
      sourcePath: "patient",
    },
    procedure: {
      caseId: "case-1",
      type: "Laparoscopic cholecystectomy",
      risk: "LOW",
      date: calendarDate("2026-06-30"),
      isElective: true,
      location: "Main OR",
      sourcePath: "procedures[0]",
    },
    evidence: {
      latestBloodPressure: {
        systolic: 120,
        diastolic: 80,
        measuredAt: new Date("2026-06-25T10:00:00.000Z"),
        source: "Pre-op clinic",
        sourcePath: "vitals[0]",
        rawValue: "120/80",
      },
      latestTemperature: {
        valueF: 98.6,
        measuredAt: new Date("2026-06-25T10:05:00.000Z"),
        source: "Pre-op clinic",
        sourcePath: "vitals[1]",
        rawValue: "98.6 F",
      },
      historyAndPhysical: {
        documentId: "doc-hp-1",
        type: "History and Physical",
        date: calendarDate("2026-06-01"),
        source: "Surgeon H&P",
        excerpt: "H&P complete.",
        sourcePath: "documents[0]",
        rawText: "H&P complete.",
      },
      surgicalConsent: {
        documentId: "doc-consent-1",
        type: "Surgical Consent",
        date: calendarDate("2026-06-20"),
        source: "Consent form",
        excerpt: "Consent signed.",
        sourcePath: "documents[1]",
        rawText: "Consent signed.",
        isSigned: true,
      },
      latestCbc: {
        labId: "lab-cbc-1",
        code: "CBC",
        effectiveAt: new Date("2026-06-15T08:00:00.000Z"),
        status: "final",
        source: "Core Lab",
        sourcePath: "labs[0]",
        rawValue: "CBC final",
      },
      latestCmp: {
        labId: "lab-cmp-1",
        code: "CMP",
        effectiveAt: new Date("2026-06-20T08:00:00.000Z"),
        status: "final",
        source: "Core Lab",
        sourcePath: "labs[1]",
        rawValue: "CMP final",
      },
      activeAnticoagulants: [],
      anticoagulationPlan: {
        present: false,
        source: null,
        date: null,
        excerpt: null,
        sourcePath: null,
        rawText: null,
        mentionsMedicationNames: [],
        hasPreProcedureInstruction: false,
        hasPostProcedureInstruction: false,
        planIsDocumentedAsMissingOrIncomplete: false,
        planMissingOrIncompleteReason: null,
      },
    },
    metadata: {
      submissionReceivedAt: calendarDate("2026-06-01"),
      sourceSystem: "test",
    },
  };

  mutate?.(input);
  return input;
}

function run(
  mutate?: (input: PreOpSchedulingRuleInput) => void,
): RulesRunnerResult {
  return runPreOpSchedulingRules(makeInput(mutate));
}

function issueByCode(
  result: RulesRunnerResult,
  code: string,
): RuleRunIssue {
  const issue = result.issues.find((issue) => issue.code === code);
  expect(issue).toBeDefined();
  return issue as RuleRunIssue;
}

function issueDetails(issue: RuleRunIssue): IssueDetails {
  return issue.details as IssueDetails;
}

function expectOnlyIssue(result: RulesRunnerResult, code: string) {
  expect(result.issues.map((issue) => issue.code)).toEqual([code]);
  return issueByCode(result, code);
}

function expectReady(result: RulesRunnerResult) {
  expect(result.decision).toBe("READY");
  expect(result.issues).toEqual([]);
}

function setHighRisk(input: PreOpSchedulingRuleInput) {
  input.procedure.risk = "HIGH";
  input.evidence.latestCbc!.effectiveAt = new Date("2026-06-20T08:00:00.000Z");
}

function setActiveAnticoagulant(input: PreOpSchedulingRuleInput) {
  input.evidence.activeAnticoagulants = [
    {
      name: "warfarin",
      sourcePath: "medications[0]",
      rawValue: "warfarin 5 mg daily",
    },
  ];
}
