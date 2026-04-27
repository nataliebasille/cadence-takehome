import dedent from "dedent";
import type { PreOpSchedulingTriagerOptions } from "../engine-options.ts";
import { Output } from "ai";
import { preOpSchedulingRuleInputSchema } from "../../types/pre-op-scheduling-rule-input.ts";
import { encode } from "@toon-format/toon";

export async function preOpSchedulingRuleInputNormalizer(
  patientInfo: unknown,
  { aiClient, logger }: PreOpSchedulingTriagerOptions,
) {
  const result = await aiClient.generate({
    prompt: buildPreOpSchedulingTriagePrompt(patientInfo),
    output: Output.object({
      schema: preOpSchedulingRuleInputSchema,
    }),
  });

  const output = result.output;
  logger.info("Completed pre-op rule input normalization", output);

  return output;
}

export function buildPreOpSchedulingTriagePrompt(patientInfo: unknown) {
  const formattedInput = formatPatientInfoForPrompt(patientInfo);

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
    - Include sourcePath for patient, procedure, and every extracted evidence item.
    - For JSON input, use stable record-level dot/bracket JSON paths, such as patient, procedure, vitals[0], labs[1], medications[0], or documents[2].
    - The patient package may be formatted as TOON. In TOON, headers like vitals[2], labs[1], medications[1], and documents[2] show the number of rows in the array. They are not sourcePath values for a selected row.
    - For TOON array rows, use the zero-based row sourcePath implied by row order. Example: the first row under documents[2] is documents[0], and the second row is documents[1].
    - For plain-text input, use only the numbered line label where the value appears, such as line 12. Do not use JSON-style paths like patient, procedure, vitals[0], labs[0], documents[0], or medications[0] for plain-text input.
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
    ${formattedInput}
  `;
}

export function formatPatientInfoForPrompt(patientInfo: unknown) {
  if (typeof patientInfo === "string") {
    return formatPlainTextPatientInfoForPrompt(patientInfo);
  }

  return typeof patientInfo === "object" ?
      encode(patientInfo)
    : String(patientInfo);
}

function formatPlainTextPatientInfoForPrompt(patientInfo: string) {
  const normalized = patientInfo.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return normalized
    .split("\n")
    .map((line, index) => `line ${index + 1}: ${line}`)
    .join("\n");
}
