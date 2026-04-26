import {
  extractEvidence,
  needsFollowUp,
  pass,
  requireDocumentation,
} from "../+helpers.ts";
import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";

const FEVER = 100.4;

export default {
  name: "Patient has a normal fever for surgery",
  category: "ACUTE_SAFETY_EXCLUSION",
  rule: checkBodyTemperature,
} satisfies RuleDefinition;

function checkBodyTemperature(input: PreOpSchedulingRuleInput): RuleOutput {
  return requireDocumentation(
    input.evidence.latestTemperature,
    "Latest body temperature",
  ).andThen((latestBodyTemperature) => {
    if (latestBodyTemperature.valueF > FEVER) {
      return needsFollowUp("ELEVATED_BODY_TEMPERATURE", {
        issues: [
          `Patient's latest body temperature is ${latestBodyTemperature.valueF}°F, which is above the fever threshold of ${FEVER}°F.`,
        ],
        evidence: [extractEvidence(latestBodyTemperature)],
      });
    }

    return pass();
  });
}
