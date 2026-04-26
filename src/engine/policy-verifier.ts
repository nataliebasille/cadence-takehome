import type { PreOpSchedulingRuleInput } from "../types/pre-op-scheduling-rule-input.ts";
import type { RuleOptions } from "./rules/+types.ts";
import { runPreOpSchedulingRules } from "./rules/runner.ts";

export function verifyPreOpSchedulingPolicy(
  input: PreOpSchedulingRuleInput,
  options: RuleOptions = {},
) {
  return {
    result: runPreOpSchedulingRules(input, options),
  };
}
