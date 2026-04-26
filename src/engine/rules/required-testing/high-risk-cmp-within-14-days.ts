import { differenceInCalendarDays } from "date-fns";

import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";
import {
  extractEvidence,
  needsFollowUp,
  parseRuleDate,
  pass,
  requireDocumentation,
} from "../+helpers.ts";

const HIGH_RISK_CMP_WINDOW_DAYS = 14;

export default {
  name: "High-risk procedures require a CMP within 14 days before the procedure date.",
  category: "REQUIRED_TESTING",
  rule: highRiskProcedureRequiresCMPWithin14Days,
} satisfies RuleDefinition;

function highRiskProcedureRequiresCMPWithin14Days(
  input: PreOpSchedulingRuleInput,
): RuleOutput {
  const procedureRisk = input.procedure.risk;
  const latestCmp = input.evidence.latestCmp;

  if (procedureRisk !== "HIGH") {
    return pass();
  }

  return requireDocumentation(latestCmp, "Latest CMP result").andThen(
    (latestCmp) =>
      parseRuleDate(latestCmp, "effectiveAt", "CMP").andThen((cmpDate) => {
        return parseRuleDate(input.procedure, "date", "Procedure").andThen(
          (procedureDate) => {
            const daysBeforeProcedure = differenceInCalendarDays(
              procedureDate,
              cmpDate,
            );

            if (
              daysBeforeProcedure < 0 ||
              daysBeforeProcedure > HIGH_RISK_CMP_WINDOW_DAYS
            ) {
              return needsFollowUp(
                `${input.procedure.risk}_PROCEDURE_CMP_OUTSIDE_14_DAY_WINDOW`,
                {
                  issues: [
                    "Latest CMP result must be completed within 14 days before the procedure date.",
                    `CMP is ${daysBeforeProcedure} days before the procedure date.`,
                  ],
                  evidence: [
                    extractEvidence(latestCmp),
                    extractEvidence(input.procedure),
                  ],
                },
              );
            }

            return pass();
          },
        );
      }),
  );
}
