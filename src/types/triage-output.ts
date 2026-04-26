import { z } from "zod";

export const triageDecisionSchema = z.enum([
  "READY",
  "NEEDS_FOLLOW_UP",
  "NOT_CLEARED",
]);

export const triageIssueCategorySchema = z.enum([
  "MISSING_REQUIRED_DATA",
  "REQUIRED_DOCUMENTATION",
  "REQUIRED_TESTING",
  "ANTICOAGULATION_MANAGEMENT",
  "ACUTE_SAFETY_EXCLUSION",
]);

export const triageEvidenceSchema = z.object({
  documentId: z.string().min(1).nullable().optional(),
  source: z.string().min(1).optional(),
  sourcePath: z.string().min(1),
});

export const triageIssueSchema = z.object({
  category: triageIssueCategorySchema,
  description: z.string().min(1),
  evidence: z.array(triageEvidenceSchema).optional(),
});

export const triageOutputSchema = z.object({
  decision: triageDecisionSchema,
  issues: z.array(triageIssueSchema),
  explanation: z.string().min(1),
  evidence: z.array(triageEvidenceSchema),
});

export type TriageDecision = z.infer<typeof triageDecisionSchema>;
export type TriageIssueCategory = z.infer<typeof triageIssueCategorySchema>;
export type TriageEvidence = z.infer<typeof triageEvidenceSchema>;
export type TriageIssue = z.infer<typeof triageIssueSchema>;
export type TriageOutput = z.infer<typeof triageOutputSchema>;
