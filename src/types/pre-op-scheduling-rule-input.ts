import { z } from "zod";

const dateSchema = z.string().transform((value, context) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    context.addIssue({
      code: "custom",
      message: "Invalid date",
    });
    return z.NEVER;
  }

  return date;
});
const nullableDateSchema = dateSchema.nullable();

export const normalizedDocumentEvidenceSchema = z.object({
  documentId: z.string().nullable(),
  type: z.string(),
  date: nullableDateSchema,
  source: z.string(),
  excerpt: z.string().nullable(),
  sourcePath: z.string(),
  rawText: z.string().nullable(),
});

export const normalizedSurgicalConsentEvidenceSchema =
  normalizedDocumentEvidenceSchema.extend({
    isSigned: z.boolean(),
  });

export const normalizedLabEvidenceSchema = z.object({
  labId: z.string().nullable(),
  code: z.enum(["CBC", "CMP"]),
  effectiveAt: nullableDateSchema,
  status: z.string().nullable(),
  source: z.string(),
  sourcePath: z.string(),
  rawValue: z.string(),
});

export const normalizedBloodPressureSchema = z.object({
  systolic: z.number(),
  diastolic: z.number(),
  measuredAt: dateSchema,
  source: z.string(),
  sourcePath: z.string(),
  rawValue: z.string(),
});

export const normalizedTemperatureSchema = z.object({
  valueF: z.number(),
  measuredAt: dateSchema,
  source: z.string(),
  sourcePath: z.string(),
  rawValue: z.string(),
});

export const preOpSchedulingRuleInputSchema = z.object({
  patient: z.object({
    id: z.string(),
    mrn: z.string(),
    dob: z.string(),
    sex: z.enum(["F", "M"]),
    sourcePath: z.string(),
  }),
  procedure: z.object({
    caseId: z.string(),
    type: z.string(),
    risk: z.enum(["LOW", "MODERATE", "HIGH"]),
    date: nullableDateSchema,
    isElective: z.boolean(),
    location: z.string(),
    sourcePath: z.string(),
  }),
  evidence: z.object({
    latestBloodPressure: normalizedBloodPressureSchema.nullable(),
    latestTemperature: normalizedTemperatureSchema.nullable(),
    historyAndPhysical: normalizedDocumentEvidenceSchema.nullable(),
    surgicalConsent: normalizedSurgicalConsentEvidenceSchema.nullable(),
    latestCbc: normalizedLabEvidenceSchema.nullable(),
    latestCmp: normalizedLabEvidenceSchema.nullable(),
    activeAnticoagulants: z.array(
      z.object({
        name: z.string(),
        sourcePath: z.string(),
        rawValue: z.string(),
      }),
    ),
    anticoagulationPlan: z.object({
      present: z.boolean(),
      source: z.string().nullable(),
      date: nullableDateSchema,
      excerpt: z.string().nullable(),
      sourcePath: z.string().nullable(),
      rawText: z.string().nullable(),
      mentionsMedicationNames: z.array(z.string()),
      hasPreProcedureInstruction: z.boolean(),
      hasPostProcedureInstruction: z.boolean(),
      planIsDocumentedAsMissingOrIncomplete: z.boolean(),
      planMissingOrIncompleteReason: z
        .object({
          excerpt: z.string(),
          sourcePath: z.string(),
        })
        .nullable(),
    }),
  }),
  metadata: z.object({
    submissionReceivedAt: dateSchema,
    sourceSystem: z.string(),
  }),
});

export type PreOpSchedulingRuleInput = z.infer<
  typeof preOpSchedulingRuleInputSchema
>;
