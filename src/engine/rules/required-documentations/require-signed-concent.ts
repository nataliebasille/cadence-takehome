import {
  extractEvidence,
  needsFollowUp,
  pass,
  requireDocumentation,
} from "../+helpers.ts";
import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";

export default {
  name: "A signed surgical consent must be present prior to surgery",
  category: "REQUIRED_DOCUMENTATION",
  rule: (input: PreOpSchedulingRuleInput): RuleOutput => {
    return requireDocumentation(
      input.evidence.surgicalConsent,
      "Signed surgical consent",
    ).andThen((surgicalConsent) => {
      if (!surgicalConsent.isSigned) {
        return needsFollowUp("SIGNED_SURGICAL_CONSENT_NOT_SIGNED", {
          issues: ["Surgical consent is present but is not signed"],
          evidence: [extractEvidence(surgicalConsent)],
        });
      }

      return pass();
    });
  },
} satisfies RuleDefinition;
