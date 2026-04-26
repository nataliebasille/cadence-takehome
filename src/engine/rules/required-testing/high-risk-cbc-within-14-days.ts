import { differenceInCalendarDays } from "date-fns";

import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";
import {
  extractEvidence,
  needsFollowUp,
  parseRuleDate,
  pass,
} from "../+helpers.ts";

const HIGH_RISK_CBC_WINDOW_DAYS = 14;

export default {
  name: "High-risk procedures require a CBC within 14 days before the procedure date.",
  category: "REQUIRED_TESTING",
  rule: highRiskProcedureRequiresCBCWithin14Days,
} satisfies RuleDefinition;

function highRiskProcedureRequiresCBCWithin14Days(
  input: PreOpSchedulingRuleInput,
): RuleOutput {
  const procedureRisk = input.procedure.risk;
  const latestCbc = input.evidence.latestCbc;

  if (procedureRisk !== "HIGH") {
    return pass();
  }

  if (!latestCbc) {
    return needsFollowUp("CBC_DATA_MISSING", {
      issues: ["Latest CBC result is required for high risk procedures."],
    });
  }

  return parseRuleDate(latestCbc, "effectiveAt", "CBC").andThen((cbcDate) => {
    return parseRuleDate(input.procedure, "date", "Procedure").andThen(
      (procedureDate) => {
        const daysBeforeProcedure = differenceInCalendarDays(
          procedureDate,
          cbcDate,
        );

        if (
          daysBeforeProcedure < 0 ||
          daysBeforeProcedure > HIGH_RISK_CBC_WINDOW_DAYS
        ) {
          return needsFollowUp(
            `${input.procedure.risk}_PROCEDURE_CBC_OUTSIDE_${HIGH_RISK_CBC_WINDOW_DAYS}_DAY_WINDOW`,
            {
              issues: [
                "Latest CBC result must be completed within 14 days before the procedure date.",
                `CBC is ${daysBeforeProcedure} days before the procedure date.`,
              ],
              evidence: [
                extractEvidence(latestCbc),
                extractEvidence(input.procedure),
              ],
            },
          );
        }

        return pass();
      },
    );
  });
}
