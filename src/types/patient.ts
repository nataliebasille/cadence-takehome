import { z } from "zod";

export type AppResult<T> = { ok: true; data: T } | { ok: false; error: Error };

export const patientNameSchema = z.object({
  given: z.string(),
  family: z.string(),
});

export const patientDemographicsSchema = z.object({
  id: z.string().uuid(),
  mrn: z.string(),
  name: patientNameSchema,
  dob: z.string(),
  sex: z.enum(["F", "M"]),
});

export const procedureSchema = z.object({
  case_id: z.string(),
  procedure_type: z.string(),
  procedure_risk: z.enum(["LOW", "MODERATE", "HIGH"]),
  procedure_date: z.string().nullable(),
  is_elective: z.boolean(),
  location: z.string(),
});

export const bloodPressureVitalSchema = z.object({
  type: z.literal("blood_pressure"),
  systolic: z.number(),
  diastolic: z.number(),
  date: z.string(),
  source: z.string(),
});

export const temperatureVitalSchema = z.object({
  type: z.literal("temperature"),
  value_f: z.number(),
  date: z.string(),
  source: z.string(),
});

export const vitalSchema = z.discriminatedUnion("type", [
  bloodPressureVitalSchema,
  temperatureVitalSchema,
]);

export const labSchema = z.object({
  id: z.string().uuid(),
  code: z.enum(["CBC", "CMP"]),
  display: z.string(),
  effective_at: z.string(),
  status: z.literal("final"),
  source: z.string(),
});

export const medicationSchema = z.object({
  name: z.string(),
  active: z.boolean(),
});

export const conditionSchema = z.object({
  name: z.string(),
  active: z.boolean(),
});

export const documentSchema = z.object({
  doc_id: z.string().uuid(),
  type: z.string(),
  date: z.string(),
  author: z.string(),
  text: z.string(),
});

export const patientMetadataSchema = z.object({
  submission_received_at: z.string(),
  source_system: z.string(),
});

export const patientSchema = z.object({
  patient: patientDemographicsSchema,
  procedure: procedureSchema,
  vitals: z.array(vitalSchema),
  labs: z.array(labSchema),
  medications: z.array(medicationSchema),
  conditions: z.array(conditionSchema),
  documents: z.array(documentSchema),
  metadata: patientMetadataSchema,
});

export type PatientName = z.infer<typeof patientNameSchema>;
export type PatientDemographics = z.infer<typeof patientDemographicsSchema>;
export type Procedure = z.infer<typeof procedureSchema>;
export type BloodPressureVital = z.infer<typeof bloodPressureVitalSchema>;
export type TemperatureVital = z.infer<typeof temperatureVitalSchema>;
export type Vital = z.infer<typeof vitalSchema>;
export type Lab = z.infer<typeof labSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type PatientDocument = z.infer<typeof documentSchema>;
export type PatientMetadata = z.infer<typeof patientMetadataSchema>;
export type Patient = z.infer<typeof patientSchema>;
