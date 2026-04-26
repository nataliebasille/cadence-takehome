import { needsFollowUp, pass } from "../+helpers.ts";
import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";

export default {
  name: "Patients taking anticoagulation medication require a complete perioperative management plan",
  category: "ANTICOAGULATION_MANAGEMENT",
  rule: requirePlanIfTakingAnticoagulationMedication,
} satisfies RuleDefinition;

function requirePlanIfTakingAnticoagulationMedication(
  input: PreOpSchedulingRuleInput,
): RuleOutput {
  const activeAnticoagulants = input.evidence.activeAnticoagulants;

  if (activeAnticoagulants.length === 0) {
    return pass();
  }

  const plan = input.evidence.anticoagulationPlan;
  const issues = [
    !plan.present &&
      "A documented perioperative anticoagulation management plan is required for patients taking anticoagulants.",
    plan.planIsDocumentedAsMissingOrIncomplete &&
      "The anticoagulation management plan is documented as missing, incomplete, or ambiguous.",
    plan.present &&
      !plan.hasPreProcedureInstruction &&
      "The anticoagulation management plan does not clearly describe pre-procedure medication management.",
    plan.present &&
      !plan.hasPostProcedureInstruction &&
      "The anticoagulation management plan does not clearly describe post-procedure medication management.",
  ].filter((issue): issue is string => !!issue);

  if (issues.length === 0) {
    return pass();
  }

  return needsFollowUp("ANTICOAGULATION_MANAGEMENT_PLAN_INCOMPLETE", {
    issues,
    evidence: [
      ...activeAnticoagulants.map((medication) => ({
        sourcePath: medication.sourcePath,
        source: medication.rawValue,
      })),
      ...(plan.sourcePath ?
        [
          {
            sourcePath: plan.sourcePath,
            ...(plan.source && { source: plan.source }),
          },
        ]
      : []),
      ...(plan.planMissingOrIncompleteReason ?
        [
          {
            sourcePath: plan.planMissingOrIncompleteReason.sourcePath,
            source: plan.planMissingOrIncompleteReason.excerpt,
          },
        ]
      : []),
    ],
    additionalDetails: {
      activeAnticoagulants: activeAnticoagulants.map(({ name }) => name),
      anticoagulationPlan: {
        present: plan.present,
        hasPreProcedureInstruction: plan.hasPreProcedureInstruction,
        hasPostProcedureInstruction: plan.hasPostProcedureInstruction,
        planIsDocumentedAsMissingOrIncomplete:
          plan.planIsDocumentedAsMissingOrIncomplete,
      },
    },
  });
}
