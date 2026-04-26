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

const HISTORY_AND_PHYSICAL_WINDOW_DAYS = 30;

export default {
  name: "History and Physical must be completed within 30 days before the procedure date.",
  category: "REQUIRED_DOCUMENTATION",
  rule: requireHistoryAndPhysicalWithin30Days,
} satisfies RuleDefinition;

function requireHistoryAndPhysicalWithin30Days(
  input: PreOpSchedulingRuleInput,
): RuleOutput {
  const historyAndPhysical = input.evidence.historyAndPhysical;

  return parseRuleDate(input.procedure, "date", "Procedure").andThen(
    (procedureDate) => {
      return requireDocumentation(
        historyAndPhysical,
        "History and physical",
      ).andThen((historyAndPhysical) => {
        return parseRuleDate(
          historyAndPhysical,
          "date",
          "History and physical",
        ).andThen((historyAndPhysicalDate) => {
          const daysBeforeProcedure = differenceInCalendarDays(
            procedureDate,
            historyAndPhysicalDate,
          );

          if (
            daysBeforeProcedure < 0 ||
            daysBeforeProcedure > HISTORY_AND_PHYSICAL_WINDOW_DAYS
          ) {
            return needsFollowUp("HISTORY_AND_PHYSICAL_OUTSIDE_30_DAY_WINDOW", {
              issues: [
                "Latest history and physical must be completed within 30 days before the procedure date.",
                `History and physical is ${daysBeforeProcedure} days before the procedure date.`,
              ],
              evidence: [
                extractEvidence(historyAndPhysical),
                extractEvidence(input.procedure),
              ],
            });
          }

          return pass();
        });
      });
    },
  );
}
