import { differenceInCalendarDays } from "date-fns";

import type { RuleDefinition, RuleOutput } from "../+types.ts";
import type { PreOpSchedulingRuleInput } from "../../../types/pre-op-scheduling-rule-input.ts";
import {
  extractEvidence,
  needsFollowUp,
  parseRuleDate,
  pass,
} from "../+helpers.ts";

const LOW_MODERATE_RISK_CBC_WINDOW_DAYS = 30;

export default {
  name: "Low or moderate risk procedures require a CBC within 30 days before the procedure date.",
  category: "REQUIRED_TESTING",
  rule: lowOrModerateRiskProcedureRequiresCBCWithin30Days,
} satisfies RuleDefinition;

function lowOrModerateRiskProcedureRequiresCBCWithin30Days(
  input: PreOpSchedulingRuleInput,
): RuleOutput {
  const procedureRisk = input.procedure.risk;
  const latestCbc = input.evidence.latestCbc;

  if (procedureRisk !== "LOW" && procedureRisk !== "MODERATE") {
    return pass();
  }

  if (!latestCbc) {
    return needsFollowUp("CBC_DATA_MISSING", {
      issues: [
        "Latest CBC result is required for low or moderate risk procedures.",
      ],
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
          daysBeforeProcedure > LOW_MODERATE_RISK_CBC_WINDOW_DAYS
        ) {
          return needsFollowUp(
            `${input.procedure.risk}_PROCEDURE_CBC_OUTSIDE_${LOW_MODERATE_RISK_CBC_WINDOW_DAYS}_DAY_WINDOW`,
            {
              issues: [
                "Latest CBC result must be completed within 30 days before the procedure date.",
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
