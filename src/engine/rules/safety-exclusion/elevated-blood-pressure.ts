import {
  extractEvidence,
  notCleared,
  pass,
  requireDocumentation,
} from "../+helpers.ts";
import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";

const SYSTOLIC_THRESHOLD = 180;
const DIASTOLIC_THRESHOLD = 110;

export default {
  name: "Patient has blood pressure within acceptable range for surgery",
  category: "ACUTE_SAFETY_EXCLUSION",
  rule: checkBloodPressure,
} satisfies RuleDefinition;

function checkBloodPressure(input: PreOpSchedulingRuleInput): RuleOutput {
  return requireDocumentation(
    input.evidence.latestBloodPressure,
    "Latest blood pressure reading",
  ).andThen((latestBloodPressure) => {
    const elevatedSystolic = latestBloodPressure.systolic >= SYSTOLIC_THRESHOLD;
    const elevatedDiastolic =
      latestBloodPressure.diastolic >= DIASTOLIC_THRESHOLD;
    if (elevatedSystolic || elevatedDiastolic) {
      return notCleared("BLOOD_PRESSURE_TOO_HIGH", {
        issues: [
          "Patient's blood pressure is critically high and requires medical clearance before proceeding with surgery.",
          [
            elevatedSystolic &&
              `Systolic: ${latestBloodPressure.systolic}; Threshold: ${SYSTOLIC_THRESHOLD}`,
            elevatedDiastolic &&
              `Diastolic: ${latestBloodPressure.diastolic}; Threshold: ${DIASTOLIC_THRESHOLD}`,
          ]
            .filter(Boolean)
            .join(" and "),
        ],
        evidence: [extractEvidence(latestBloodPressure)],
      });
    }

    return pass();
  });
}
