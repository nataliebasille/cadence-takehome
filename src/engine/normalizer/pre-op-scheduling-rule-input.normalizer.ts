import dedent from "dedent";
import type { PreOpSchedulingTriagerOptions } from "../engine-options.ts";
import { Output } from "ai";
import { preOpSchedulingRuleInputSchema as llmPreOpSchedulingRuleInputSchema } from "../schemas/public.ts";
import { preOpSchedulingRuleInputSchema } from "../../types/pre-op-scheduling-rule-input.ts";
import { encode } from "@toon-format/toon";

export async function preOpSchedulingRuleInputNormalizer(
  patientInfo: unknown,
  { aiClient, logger }: PreOpSchedulingTriagerOptions,
) {
  const result = await aiClient.generate({
    prompt: buildPreOpSchedulingTriagePrompt(patientInfo),
    output: Output.object({
      schema: llmPreOpSchedulingRuleInputSchema,
    }),
  });

  const llmOutput = llmPreOpSchedulingRuleInputSchema.parse(result.output);
  const output = preOpSchedulingRuleInputSchema.parse(llmOutput);
  logger.info("Completed pre-op rule input normalization", llmOutput);

  return output;
}

function buildPreOpSchedulingTriagePrompt(patientInfo: unknown) {
  const infoFormattedForPrompt =
    typeof patientInfo === "object" ? encode(patientInfo) : String(patientInfo);

  return dedent`
    You are a pre-op scheduling triage assistant.
    Normalize the patient record into the canonical pre-op scheduling rules-engine input.
    Do not decide whether the patient is READY, NEEDS_FOLLOW_UP, or NOT_CLEARED.
    Do not produce issues, recommendations, explanations, or policy conclusions.

    Final output requirements:
    - Return valid JSON matching the provided schema.
    - Pull out the relevant information from the JSON and normalize only those fields needed by a rules engine.
    - Preserve source field values exactly where possible in rawValue or rawText fields.
    - Use null only when the source datum is absent.
    - Include sourcePath for patient, procedure, and every extracted evidence item, using dot/bracket JSON paths such as patient, procedure, vitals[0].systolic, or documents[2].text.
    - Select only the most recent blood pressure, temperature, CBC, CMP, History and Physical, and Surgical Consent.
    - Extract short document excerpts as evidence while also preserving the full source document text in rawText.
    - For Surgical Consent only, set isSigned to true when the selected consent explicitly indicates it was signed, electronically signed, executed, or obtained. Set isSigned to false when it is unsigned, pending signature, draft, missing a signature, or does not clearly show signed consent.
    - Set anticoagulationPlan flags from the text itself; do not infer missing instructions from policy.

    Normalization notes:
    - activeAnticoagulants includes active warfarin, rivaroxaban, apixaban, dabigatran, edoxaban, enoxaparin, heparin, or clopidogrel medications.
    - hasPreProcedureInstruction is true only when the plan says to hold, stop, pause, or withhold an anticoagulant before the procedure.
    - hasPostProcedureInstruction is true only when the plan says to resume or restart an anticoagulant after the procedure.
    - planIsDocumentedAsMissingOrIncomplete is true when the text says the plan or instructions are absent, missing, or incomplete.
    - planMissingOrIncompleteReason is null unless planIsDocumentedAsMissingOrIncomplete is true; when true, include a short excerpt showing the missing/incomplete/ambiguous plan language and the sourcePath where it appears.

    Patient submission package:
    ${infoFormattedForPrompt}
  `;
}
