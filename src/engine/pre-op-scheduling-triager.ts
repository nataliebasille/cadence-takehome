import type { Patient } from "../types/patient.ts";
import type { PreOpSchedulingTriagerOptions } from "./engine-options.ts";
import { preOpSchedulingRuleInputNormalizer } from "./normalizer/pre-op-scheduling-rule-input.normalizer.ts";
import { runPreOpSchedulingRules } from "./rules/runner.ts";

/**
 * Main business logic entry point for pre-op scheduling triage.
 *
 * This function owns the full decision flow: normalize patient data into the
 * rules input shape, then run deterministic scheduling rules to produce the
 * final triage result.
 */
export async function preOpSchedulingTriager(
  patient: Patient,
  options: PreOpSchedulingTriagerOptions,
) {
  options.logger.info("Starting pre-op scheduling triage", patient);

  const ruleInputs = await preOpSchedulingRuleInputNormalizer(patient, options);

  options.logger.info(
    "Completed normalizing patient data for pre-op scheduling rules",
    ruleInputs,
  );

  return runPreOpSchedulingRules(ruleInputs);
}
