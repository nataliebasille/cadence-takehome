import { readFile } from "node:fs/promises";

import { evalite } from "evalite";
import { reportTrace } from "evalite/traces";

import { preOpSchedulingRuleInputNormalizer } from "../../engine/normalizer/pre-op-scheduling-rule-input.normalizer.ts";
import { createLlmClient } from "../../lib/ai/create-llm-client.ts";
import { createOpenAIModel } from "../../lib/ai/models/openai.ts";
import { appConfig } from "../../lib/config/app-config.ts";
import { parseLogLevel, type Logger, type LogLevel } from "../../lib/logger.ts";

const anticoagulants = new Set([
  "apixaban",
  "clopidogrel",
  "dabigatran",
  "edoxaban",
  "enoxaparin",
  "heparin",
  "rivaroxaban",
  "warfarin",
]);

type RawPatient = {
  patient: {
    id: string;
    mrn: string;
    dob: string;
    sex: "F" | "M";
  };
  procedure: {
    case_id: string;
    procedure_type: string;
    procedure_risk: "LOW" | "MODERATE" | "HIGH";
    procedure_date: string | null;
    is_elective: boolean;
    location: string;
  };
  vitals: Array<
    | {
        type: "blood_pressure";
        systolic: number;
        diastolic: number;
        date: string;
        source: string;
      }
    | {
        type: "temperature";
        value_f: number;
        date: string;
        source: string;
      }
  >;
  labs: Array<{
    id: string | null;
    code: string;
    effective_at: string;
    status: string | null;
    source: string;
  }>;
  medications: Array<{
    name: string;
    active: boolean;
  }>;
  documents: Array<{
    doc_id: string | null;
    type: string;
    date: string;
    source?: string;
    text: string;
    isSigned?: boolean;
  }>;
  metadata: {
    submission_received_at: string;
    source_system: string;
  };
};

type BuiltNormalizerExpected = ReturnType<typeof buildExpected>;
type SourcePathExpectation = string | readonly string[];
type ExpectedSourcePaths = {
  patient?: SourcePathExpectation;
  procedure?: SourcePathExpectation;
  latestBloodPressure?: SourcePathExpectation;
  latestTemperature?: SourcePathExpectation;
  latestCbc?: SourcePathExpectation;
  latestCmp?: SourcePathExpectation;
  historyAndPhysical?: SourcePathExpectation;
  surgicalConsent?: SourcePathExpectation;
  medicationPlan?: SourcePathExpectation;
  activeAnticoagulants: Array<{
    name: string;
    sourcePath: SourcePathExpectation;
  }>;
};
type NormalizerExpected = Omit<BuiltNormalizerExpected, "sourcePaths"> & {
  sourcePaths?: ExpectedSourcePaths;
  anticoagulationPlan?: {
    present: boolean;
    hasPreProcedureInstruction: boolean;
    hasPostProcedureInstruction: boolean;
    planIsDocumentedAsMissingOrIncomplete: boolean;
    planMissingOrIncompleteReason: {
      excerptIncludes: string[];
      sourcePathIncludes?: string;
    } | null;
  };
};
type NormalizerOutput = Awaited<
  ReturnType<typeof preOpSchedulingRuleInputNormalizer>
>;

type NormalizerInput = {
  name: string;
  patientInput?: unknown;
  patientPath?: string;
};

export function defineNormalizeForPatientJsonEval(fixtureName: string) {
  defineNormalizerCaseEval(
    `pre-op normalizer maps ${fixtureName}`,
    async () => {
      const patientPath = `patients/${fixtureName}/patient.json`;
      const patient = JSON.parse(
        await readFile(patientPath, "utf8"),
      ) as RawPatient;

      return {
        input: {
          name: fixtureName,
          patientPath,
        },
        expected: buildExpected(patient),
      };
    },
  );
}

export function defineNormalizeForPatientTextEval(
  fixtureName: string,
  expected: NormalizerExpected,
) {
  defineNormalizerCaseEval(
    `pre-op normalizer maps ${fixtureName} text packet`,
    async () => {
      const patientPath = `patients/${fixtureName}/patient.txt`;
      const patientInput = await readFile(patientPath, "utf8");

      return {
        input: {
          name: fixtureName,
          patientInput,
          patientPath,
        },
        expected,
      };
    },
  );
}

export function defineInlineNormalizerEval(
  evalName: string,
  input: NormalizerInput,
  expected: NormalizerExpected,
) {
  defineNormalizerCaseEval(evalName, async () => ({
    input,
    expected,
  }));
}

function defineNormalizerCaseEval(
  evalName: string,
  data: () => Promise<{ input: NormalizerInput; expected: NormalizerExpected }>,
) {
  evalite(evalName, {
    data: async () => {
      return [await data()];
    },

    task: runNormalizerForEval,

    scorers: [
      {
        name: "maps patient and procedure",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(expected && patientAndProcedureMatch(output, expected)),
            input.name,
            "maps patient and procedure",
            () => ({
              expected: expected?.patient,
              actual: output.patient,
              expectedProcedure: expected?.procedure,
              actualProcedure: output.procedure,
            }),
          ),
      },
      {
        name: "emits valid dates",
        scorer: ({ input, output }) =>
          scoreWithMetadata(
            outputDatesAreValid(output),
            input.name,
            "emits valid dates",
            () => ({
              dateTypes: describeOutputDates(output),
            }),
          ),
      },
      {
        name: "maps source paths",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(expected && sourcePathsMatch(output, expected)),
            input.name,
            "maps source paths",
            () => ({
              expected: expected?.sourcePaths,
              actual: describeOutputSourcePaths(output),
            }),
          ),
      },
      {
        name: "selects latest vitals",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(expected && latestVitalsMatch(output, expected)),
            input.name,
            "selects latest vitals",
            () => ({
              expectedBloodPressure: expected?.latestBloodPressure,
              actualBloodPressure: output.evidence.latestBloodPressure,
              expectedTemperature: expected?.latestTemperature,
              actualTemperature: output.evidence.latestTemperature,
            }),
          ),
      },
      {
        name: "selects latest CBC and CMP",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(expected && latestLabsMatch(output, expected)),
            input.name,
            "selects latest CBC and CMP",
            () => ({
              expectedCbc: expected?.latestCbc,
              actualCbc: output.evidence.latestCbc,
              expectedCmp: expected?.latestCmp,
              actualCmp: output.evidence.latestCmp,
            }),
          ),
      },
      {
        name: "selects relevant documents",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(expected && documentsMatch(output, expected)),
            input.name,
            "selects relevant documents",
            () => ({
              expectedHistoryAndPhysical: expected?.historyAndPhysical,
              actualHistoryAndPhysical: output.evidence.historyAndPhysical,
              expectedSurgicalConsent: expected?.surgicalConsent,
              actualSurgicalConsent: output.evidence.surgicalConsent,
            }),
          ),
      },
      {
        name: "extracts active anticoagulants",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(expected && anticoagulantsMatch(output, expected)),
            input.name,
            "extracts active anticoagulants",
            () => ({
              expected: expected?.activeAnticoagulants,
              actual: output.evidence.activeAnticoagulants,
            }),
          ),
      },
      {
        name: "maps anticoagulation plan presence",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(
              expected && anticoagulationPlanPresenceMatches(output, expected),
            ),
            input.name,
            "maps anticoagulation plan presence",
            () => ({
              expectedMedicationPlan: expected?.medicationPlan,
              actualAnticoagulationPlan: output.evidence.anticoagulationPlan,
            }),
          ),
      },
      {
        name: "maps plan missing or incomplete reason",
        scorer: ({ input, output, expected }) =>
          scoreWithMetadata(
            Boolean(
              expected &&
              anticoagulationPlanMissingReasonMatches(output, expected),
            ),
            input.name,
            "maps plan missing or incomplete reason",
            () => ({
              expected: expected?.anticoagulationPlan,
              actual: {
                present: output.evidence.anticoagulationPlan.present,
                hasPreProcedureInstruction:
                  output.evidence.anticoagulationPlan
                    .hasPreProcedureInstruction,
                hasPostProcedureInstruction:
                  output.evidence.anticoagulationPlan
                    .hasPostProcedureInstruction,
                planIsDocumentedAsMissingOrIncomplete:
                  output.evidence.anticoagulationPlan
                    .planIsDocumentedAsMissingOrIncomplete,
                planMissingOrIncompleteReason:
                  output.evidence.anticoagulationPlan
                    .planMissingOrIncompleteReason,
              },
            }),
          ),
      },
    ],

    columns: ({ input, output, scores }) => [
      { label: "fixture", value: input.name },
      {
        label: "patient/case",
        value: `${output.patient.id} / ${output.procedure.caseId}`,
      },
      { label: "procedure", value: formatProcedure(output) },
      { label: "vitals", value: formatVitals(output) },
      { label: "labs", value: formatLabs(output) },
      { label: "docs", value: formatDocuments(output) },
      { label: "meds/plan", value: formatAnticoagulation(output) },
      { label: "scores", value: formatScoreSummary(scores) },
      { label: "failures", value: formatFailedScores(scores) },
    ],
  });
}

async function runNormalizerForEval({
  name,
  patientInput,
  patientPath,
}: NormalizerInput) {
  loadLocalEnv();

  const startedAt = Date.now();
  const logLevel = configuredLogLevel();
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const config = await appConfig.fromEnv(process.env);
  logEvalMessage(name, logLevel, "info", `starting normalizer with ${model}`);

  const patient =
    patientInput ??
    JSON.parse(await readFile(requiredInputPath(name, patientPath), "utf8"));
  const aiClient = createLlmClient(
    createOpenAIModel({
      apiKey: config.openAIApiKey,
      model,
    }),
  );

  try {
    const output = await preOpSchedulingRuleInputNormalizer(patient, {
      aiClient,
      logger: createEvalLogger(name, logLevel),
      now: () => new Date(),
    });

    logEvalMessage(
      name,
      logLevel,
      "info",
      `normalized ${output.patient.mrn} in ${Date.now() - startedAt}ms`,
    );
    reportTrace({
      input: { fixture: name, patientPath, model },
      output: summarizeNormalizerOutput(output),
      start: startedAt,
      end: Date.now(),
    });

    return output;
  } catch (error) {
    logEvalMessage(
      name,
      logLevel,
      "error",
      `failed after ${Date.now() - startedAt}ms`,
      error,
    );
    throw error;
  }
}

function requiredInputPath(name: string, patientPath: string | undefined) {
  if (!patientPath) {
    throw new Error(
      `${name} eval requires either patientInput or patientPath.`,
    );
  }

  return patientPath;
}

function buildExpected(patient: RawPatient) {
  const latestBloodPressure = latestByDate(
    patient.vitals.filter((vital) => vital.type === "blood_pressure"),
    (vital) => vital.date,
  );
  const latestTemperature = latestByDate(
    patient.vitals.filter((vital) => vital.type === "temperature"),
    (vital) => vital.date,
  );
  const latestCbc = latestByDate(
    patient.labs.filter((lab) => lab.code === "CBC"),
    (lab) => lab.effective_at,
  );
  const latestCmp = latestByDate(
    patient.labs.filter((lab) => lab.code === "CMP"),
    (lab) => lab.effective_at,
  );
  const historyAndPhysical = latestByDate(
    patient.documents.filter((document) =>
      document.type.toLowerCase().includes("history and physical"),
    ),
    (document) => document.date,
  );
  const latestSurgicalConsent = latestByDate(
    patient.documents.filter((document) =>
      document.type.toLowerCase().includes("surgical consent"),
    ),
    (document) => document.date,
  );
  const surgicalConsent =
    latestSurgicalConsent ?
      {
        ...latestSurgicalConsent,
        isSigned: expectedSurgicalConsentIsSigned(latestSurgicalConsent),
      }
    : undefined;
  const medicationPlan = latestByDate(
    patient.documents.filter((document) =>
      document.type.toLowerCase().includes("medication plan"),
    ),
    (document) => document.date,
  );
  const activeAnticoagulantMedications = patient.medications
    .map((medication, index) => ({ medication, index }))
    .filter(
      ({ medication }) =>
        medication.active && anticoagulants.has(medication.name.toLowerCase()),
    )
    .sort((left, right) =>
      left.medication.name.localeCompare(right.medication.name),
    );

  return {
    patient: {
      id: patient.patient.id,
      mrn: patient.patient.mrn,
      dob: patient.patient.dob,
      sex: patient.patient.sex,
    },
    procedure: {
      caseId: patient.procedure.case_id,
      type: patient.procedure.procedure_type,
      risk: patient.procedure.procedure_risk,
      date: patient.procedure.procedure_date,
      isElective: patient.procedure.is_elective,
      location: patient.procedure.location,
    },
    latestBloodPressure,
    latestTemperature,
    latestCbc,
    latestCmp,
    historyAndPhysical,
    surgicalConsent,
    medicationPlan,
    activeAnticoagulants: patient.medications
      .filter(
        (medication) =>
          medication.active &&
          anticoagulants.has(medication.name.toLowerCase()),
      )
      .map((medication) => medication.name)
      .sort(),
    metadata: {
      submissionReceivedAt: patient.metadata.submission_received_at,
      sourceSystem: patient.metadata.source_system,
    },
    sourcePaths: {
      patient: "patient",
      procedure: "procedure",
      latestBloodPressure: sourcePathForItem(
        patient.vitals,
        latestBloodPressure,
        "vitals",
      ),
      latestTemperature: sourcePathForItem(
        patient.vitals,
        latestTemperature,
        "vitals",
      ),
      latestCbc: sourcePathForItem(patient.labs, latestCbc, "labs"),
      latestCmp: sourcePathForItem(patient.labs, latestCmp, "labs"),
      historyAndPhysical: sourcePathForItem(
        patient.documents,
        historyAndPhysical,
        "documents",
      ),
      surgicalConsent: sourcePathForItem(
        patient.documents,
        latestSurgicalConsent,
        "documents",
      ),
      medicationPlan: sourcePathForItem(
        patient.documents,
        medicationPlan,
        "documents",
      ),
      activeAnticoagulants: activeAnticoagulantMedications.map(
        ({ medication, index }) => ({
          name: medication.name,
          sourcePath: `medications[${index}]`,
        }),
      ),
    },
  };
}

function createEvalLogger(fixtureName: string, logLevel: LogLevel): Logger {
  return {
    debug: (message, context) =>
      logEvalMessage(fixtureName, logLevel, "debug", message, context),
    info: (message, context) =>
      logEvalMessage(fixtureName, logLevel, "info", message, context),
    warn: (message, context) =>
      logEvalMessage(fixtureName, logLevel, "warn", message, context),
    error: (message, context) =>
      logEvalMessage(fixtureName, logLevel, "error", message, context),
  };
}

function logEvalMessage(
  fixtureName: string,
  configuredLevel: LogLevel,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: unknown,
) {
  if (!shouldLog(level, configuredLevel)) {
    return;
  }

  const summary = context ? summarizeNormalizerOutput(context) : undefined;
  const suffix = summary ? ` ${JSON.stringify(summary)}` : "";
  console[level](`[eval] ${fixtureName}: ${message}${suffix}`);
}

function shouldLog(
  messageLevel: "debug" | "info" | "warn" | "error",
  configuredLevel: LogLevel,
) {
  const logLevelPriority = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  } satisfies Record<LogLevel, number>;

  return logLevelPriority[messageLevel] <= logLevelPriority[configuredLevel];
}

function summarizeNormalizerOutput(value: unknown) {
  if (!isNormalizerOutputLike(value)) {
    return value;
  }

  return {
    patientId: value.patient.id,
    caseId: value.procedure.caseId,
    procedureDate: value.procedure.date,
    latestBloodPressure:
      value.evidence.latestBloodPressure ?
        `${value.evidence.latestBloodPressure.systolic}/${value.evidence.latestBloodPressure.diastolic}`
      : null,
    latestTemperature: value.evidence.latestTemperature?.valueF ?? null,
    latestCbc: value.evidence.latestCbc?.labId ?? null,
    latestCmp: value.evidence.latestCmp?.labId ?? null,
    historyAndPhysical: value.evidence.historyAndPhysical?.documentId ?? null,
    surgicalConsent: value.evidence.surgicalConsent?.documentId ?? null,
    activeAnticoagulants: value.evidence.activeAnticoagulants.map(
      (medication) => medication.name,
    ),
    anticoagulationPlanPresent: value.evidence.anticoagulationPlan.present,
  };
}

function isNormalizerOutputLike(value: unknown): value is NormalizerOutput {
  return (
    typeof value === "object" &&
    value !== null &&
    "patient" in value &&
    "procedure" in value &&
    "evidence" in value
  );
}

function scoreWithMetadata(
  passed: boolean,
  fixtureName: string,
  scorerName: string,
  metadata: () => unknown,
): { score: number; metadata?: unknown } {
  if (passed) {
    return { score: 1 };
  }

  const details = metadata();
  logEvalMessage(
    fixtureName,
    configuredLogLevel(),
    "warn",
    `scorer failed: ${scorerName} ${formatJson(details)}`,
  );

  return {
    score: 0,
    metadata: details,
  };
}

function describeOutputDates(output: NormalizerOutput) {
  return {
    procedureDate: typeof output.procedure.date,
    latestBloodPressure: typeof output.evidence.latestBloodPressure?.measuredAt,
    latestTemperature: typeof output.evidence.latestTemperature?.measuredAt,
    historyAndPhysical: typeof output.evidence.historyAndPhysical?.date,
    surgicalConsent: typeof output.evidence.surgicalConsent?.date,
    latestCbc: typeof output.evidence.latestCbc?.effectiveAt,
    latestCmp: typeof output.evidence.latestCmp?.effectiveAt,
    anticoagulationPlan: typeof output.evidence.anticoagulationPlan.date,
    submissionReceivedAt: typeof output.metadata.submissionReceivedAt,
  };
}

function describeOutputSourcePaths(output: NormalizerOutput) {
  return {
    patient: output.patient.sourcePath,
    procedure: output.procedure.sourcePath,
    latestBloodPressure: output.evidence.latestBloodPressure?.sourcePath,
    latestTemperature: output.evidence.latestTemperature?.sourcePath,
    latestCbc: output.evidence.latestCbc?.sourcePath,
    latestCmp: output.evidence.latestCmp?.sourcePath,
    historyAndPhysical: output.evidence.historyAndPhysical?.sourcePath,
    surgicalConsent: output.evidence.surgicalConsent?.sourcePath,
    medicationPlan: output.evidence.anticoagulationPlan.sourcePath,
    activeAnticoagulants: output.evidence.activeAnticoagulants.map(
      (medication) => ({
        name: medication.name,
        sourcePath: medication.sourcePath,
      }),
    ),
  };
}

function formatProcedure(output: NormalizerOutput) {
  return [
    output.procedure.risk,
    output.procedure.isElective ? "elective" : "non-elective",
    formatDateValue(output.procedure.date),
  ].join(" | ");
}

function formatVitals(output: NormalizerOutput) {
  const bloodPressure = output.evidence.latestBloodPressure;
  const temperature = output.evidence.latestTemperature;

  return [
    `BP ${bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : "none"}`,
    `Temp ${temperature ? `${temperature.valueF}F` : "none"}`,
  ].join(" | ");
}

function formatLabs(output: NormalizerOutput) {
  return [
    `CBC ${formatEvidenceId(output.evidence.latestCbc?.labId)}`,
    `CMP ${formatEvidenceId(output.evidence.latestCmp?.labId)}`,
  ].join(" | ");
}

function formatDocuments(output: NormalizerOutput) {
  return [
    `H&P ${formatEvidenceId(output.evidence.historyAndPhysical?.documentId)}`,
    `Consent ${formatEvidenceId(output.evidence.surgicalConsent?.documentId)}`,
  ].join(" | ");
}

function formatAnticoagulation(output: NormalizerOutput) {
  const medications = output.evidence.activeAnticoagulants
    .map((medication) => medication.name)
    .join(", ");
  const plan = output.evidence.anticoagulationPlan;
  const missing =
    plan.planIsDocumentedAsMissingOrIncomplete ? " documented incomplete" : "";

  return [
    medications || "none",
    `plan ${plan.present ? "present" : "missing"}${missing}`,
    `pre ${formatBoolean(plan.hasPreProcedureInstruction)}`,
    `post ${formatBoolean(plan.hasPostProcedureInstruction)}`,
  ].join(" | ");
}

function formatScoreSummary(scores: unknown) {
  const normalized = normalizeScores(scores);
  const total = normalized.length;
  const passed = normalized.filter((score) => score.score >= 1).length;

  if (total === 0) {
    return "n/a";
  }

  return `${passed}/${total}`;
}

function formatFailedScores(scores: unknown) {
  const failures = normalizeScores(scores)
    .filter((score) => score.score < 1)
    .map((score) => score.name);

  return failures.length > 0 ? failures.join("; ") : "none";
}

function normalizeScores(
  scores: unknown,
): Array<{ name: string; score: number }> {
  if (Array.isArray(scores)) {
    return scores.map((score, index) => ({
      name: readScoreName(score, String(index + 1)),
      score: readScoreValue(score),
    }));
  }

  if (typeof scores === "object" && scores !== null) {
    return Object.entries(scores).map(([name, score]) => ({
      name,
      score: readScoreValue(score),
    }));
  }

  return [];
}

function readScoreName(score: unknown, fallback: string) {
  if (typeof score === "object" && score !== null && "name" in score) {
    const name = (score as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }

  return fallback;
}

function readScoreValue(score: unknown) {
  if (typeof score === "number") {
    return score;
  }

  if (typeof score === "object" && score !== null && "score" in score) {
    const value = (score as { score?: unknown }).score;
    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
}

function formatDateValue(value: Date | string | null) {
  const normalized = normalizeDateValue(value);
  return normalized ? normalized.toISOString().slice(0, 10) : "none";
}

function formatEvidenceId(value: string | null | undefined) {
  return value && value.length > 0 ? value : "none";
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

function formatJson(value: unknown) {
  return JSON.stringify(value, (_key, current) =>
    current instanceof Date ? current.toISOString() : current,
  );
}

function latestByDate<T>(items: T[], getDate: (item: T) => string) {
  return [...items].sort(
    (left, right) => Date.parse(getDate(right)) - Date.parse(getDate(left)),
  )[0];
}

function sourcePathForItem<T>(
  items: T[],
  selected: T | undefined,
  collectionPath: string,
) {
  const index = selected ? items.indexOf(selected) : -1;
  return index >= 0 ? `${collectionPath}[${index}]` : undefined;
}

function sourcePathsMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  return (
    sourcePathMatches(
      output.patient.sourcePath,
      expected.sourcePaths?.patient,
    ) &&
    sourcePathMatches(
      output.procedure.sourcePath,
      expected.sourcePaths?.procedure,
    ) &&
    sourcePathMatches(
      output.evidence.latestBloodPressure?.sourcePath ?? null,
      expected.sourcePaths?.latestBloodPressure,
    ) &&
    sourcePathMatches(
      output.evidence.latestTemperature?.sourcePath ?? null,
      expected.sourcePaths?.latestTemperature,
    ) &&
    sourcePathMatches(
      output.evidence.latestCbc?.sourcePath ?? null,
      expected.sourcePaths?.latestCbc,
    ) &&
    sourcePathMatches(
      output.evidence.latestCmp?.sourcePath ?? null,
      expected.sourcePaths?.latestCmp,
    ) &&
    sourcePathMatches(
      output.evidence.historyAndPhysical?.sourcePath ?? null,
      expected.sourcePaths?.historyAndPhysical,
    ) &&
    sourcePathMatches(
      output.evidence.surgicalConsent?.sourcePath ?? null,
      expected.sourcePaths?.surgicalConsent,
    ) &&
    sourcePathMatches(
      output.evidence.anticoagulationPlan.sourcePath,
      expected.sourcePaths?.medicationPlan,
    ) &&
    activeAnticoagulantSourcePathsMatch(output, expected)
  );
}

function activeAnticoagulantSourcePathsMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  return output.evidence.activeAnticoagulants.every((medication) => {
    const expectedMedication = expected.sourcePaths?.activeAnticoagulants.find(
      (item) => item.name.toLowerCase() === medication.name.toLowerCase(),
    );

    return sourcePathMatches(
      medication.sourcePath,
      expectedMedication?.sourcePath,
    );
  });
}

function patientAndProcedureMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  return (
    output.patient.id === expected.patient.id &&
    output.patient.mrn === expected.patient.mrn &&
    output.patient.dob === expected.patient.dob &&
    output.patient.sex === expected.patient.sex &&
    output.procedure.caseId === expected.procedure.caseId &&
    looseTextMatches(output.procedure.type, expected.procedure.type) &&
    output.procedure.risk === expected.procedure.risk &&
    datesEqual(output.procedure.date, expected.procedure.date) &&
    output.procedure.isElective === expected.procedure.isElective &&
    looseTextMatches(output.procedure.location, expected.procedure.location) &&
    sourceMatches(
      output.metadata.sourceSystem,
      expected.metadata.sourceSystem,
    ) &&
    datesEqual(
      output.metadata.submissionReceivedAt,
      expected.metadata.submissionReceivedAt,
    )
  );
}

function outputDatesAreValid(output: NormalizerOutput) {
  return [
    output.procedure.date,
    output.evidence.latestBloodPressure?.measuredAt,
    output.evidence.latestTemperature?.measuredAt,
    output.evidence.historyAndPhysical?.date,
    output.evidence.surgicalConsent?.date,
    output.evidence.latestCbc?.effectiveAt,
    output.evidence.latestCmp?.effectiveAt,
    output.evidence.anticoagulationPlan.date,
    output.metadata.submissionReceivedAt,
  ].every((value) => value === null || value === undefined || normalizeDateValue(value));
}

function latestVitalsMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  const bp = output.evidence.latestBloodPressure;
  const temp = output.evidence.latestTemperature;

  return (
    (!expected.latestBloodPressure ||
      (bp !== null &&
        bp.systolic === expected.latestBloodPressure.systolic &&
        bp.diastolic === expected.latestBloodPressure.diastolic &&
        datesEqual(bp.measuredAt, expected.latestBloodPressure.date) &&
        sourceMatches(bp.source, expected.latestBloodPressure.source))) &&
    (!expected.latestTemperature ||
      (temp !== null &&
        temp.valueF === expected.latestTemperature.value_f &&
        datesEqual(temp.measuredAt, expected.latestTemperature.date) &&
        sourceMatches(temp.source, expected.latestTemperature.source)))
  );
}

function latestLabsMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  return (
    labMatches(output.evidence.latestCbc, expected.latestCbc) &&
    labMatches(output.evidence.latestCmp, expected.latestCmp)
  );
}

function labMatches(
  outputLab: NormalizerOutput["evidence"]["latestCbc"],
  expectedLab: NormalizerExpected["latestCbc"],
) {
  if (!expectedLab) {
    return outputLab === null;
  }

  return (
    outputLab !== null &&
    (expectedLab.id === null || outputLab.labId === expectedLab.id) &&
    outputLab.code === expectedLab.code &&
    datesEqual(outputLab.effectiveAt, expectedLab.effective_at) &&
    (expectedLab.status === null || outputLab.status === expectedLab.status) &&
    sourceMatches(outputLab.source, expectedLab.source)
  );
}

function documentsMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  return (
    documentMatches(
      output.evidence.historyAndPhysical,
      expected.historyAndPhysical,
    ) &&
    documentMatches(output.evidence.surgicalConsent, expected.surgicalConsent)
  );
}

function documentMatches(
  outputDocument: NormalizerOutput["evidence"]["historyAndPhysical"],
  expectedDocument: NormalizerExpected["historyAndPhysical"],
) {
  if (!expectedDocument) {
    return outputDocument === null;
  }

  return (
    outputDocument !== null &&
    outputDocument.type === expectedDocument.type &&
    datesEqual(outputDocument.date, expectedDocument.date) &&
    surgicalConsentSignedStatusMatches(outputDocument, expectedDocument) &&
    (!expectedDocument.text ||
      textEqual(outputDocument.rawText, expectedDocument.text))
  );
}

function expectedSurgicalConsentIsSigned(document: {
  text: string;
  isSigned?: boolean;
}) {
  if (document.isSigned !== undefined) {
    return document.isSigned;
  }

  const text = normalizeText(document.text).toLowerCase();
  const unsignedSignals = [
    "not signed",
    "unsigned",
    "pending signature",
    "missing signature",
    "signature pending",
    "draft",
  ];

  if (unsignedSignals.some((signal) => text.includes(signal))) {
    return false;
  }

  return ["signed", "electronically signed", "e-signed", "executed"].some(
    (signal) => text.includes(signal),
  );
}

function surgicalConsentSignedStatusMatches(
  outputDocument: NormalizerOutput["evidence"]["historyAndPhysical"],
  expectedDocument: NormalizerExpected["historyAndPhysical"],
) {
  if (
    !expectedDocument ||
    !("isSigned" in expectedDocument) ||
    typeof expectedDocument.isSigned !== "boolean"
  ) {
    return true;
  }

  return (
    outputDocument !== null &&
    "isSigned" in outputDocument &&
    outputDocument.isSigned === expectedDocument.isSigned
  );
}

function anticoagulantsMatch(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  const outputMedications = output.evidence.activeAnticoagulants
    .map((medication) => ({
      name: medication.name.toLowerCase(),
      sourcePath: medication.sourcePath,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const expectedNames = expected.activeAnticoagulants
    .map((name) => name.toLowerCase())
    .sort();
  const namesMatch = arraysEqual(
    outputMedications.map((medication) => medication.name),
    expectedNames,
  );

  if (!namesMatch) {
    return false;
  }

  return true;
}

function anticoagulationPlanPresenceMatches(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  const plan = output.evidence.anticoagulationPlan;

  if (!expected.medicationPlan) {
    return (
      plan.present === false &&
      plan.source === null &&
      plan.sourcePath === null &&
      plan.rawText === null
    );
  }

  return (
    plan.present === true &&
    datesEqual(plan.date, expected.medicationPlan.date) &&
    (!expected.medicationPlan.text ||
      textEqual(plan.rawText, expected.medicationPlan.text))
  );
}

function anticoagulationPlanMissingReasonMatches(
  output: NormalizerOutput,
  expected: NormalizerExpected,
) {
  const expectedPlan = expected.anticoagulationPlan;

  if (!expectedPlan) {
    return true;
  }

  const actualPlan = output.evidence.anticoagulationPlan;

  return (
    actualPlan.present === expectedPlan.present &&
    actualPlan.hasPreProcedureInstruction ===
      expectedPlan.hasPreProcedureInstruction &&
    actualPlan.hasPostProcedureInstruction ===
      expectedPlan.hasPostProcedureInstruction &&
    actualPlan.planIsDocumentedAsMissingOrIncomplete ===
      expectedPlan.planIsDocumentedAsMissingOrIncomplete &&
    planMissingOrIncompleteReasonMatches(
      actualPlan.planMissingOrIncompleteReason,
      expectedPlan.planMissingOrIncompleteReason,
    )
  );
}

function planMissingOrIncompleteReasonMatches(
  actual: NormalizerOutput["evidence"]["anticoagulationPlan"]["planMissingOrIncompleteReason"],
  expected:
    | NonNullable<
        NormalizerExpected["anticoagulationPlan"]
      >["planMissingOrIncompleteReason"]
    | undefined,
) {
  if (!expected) {
    return actual === null;
  }

  if (!actual) {
    return false;
  }

  const actualExcerpt = normalizeText(actual.excerpt).toLowerCase();
  const excerptMatches = expected.excerptIncludes.every((fragment) =>
    actualExcerpt.includes(normalizeText(fragment).toLowerCase()),
  );
  const sourcePathMatches =
    !expected.sourcePathIncludes ||
    actual.sourcePath.includes(expected.sourcePathIncludes);

  return excerptMatches && sourcePathMatches;
}

function datesEqual(actual: Date | string | null, expected: string | null) {
  if (actual === null || expected === null) {
    return actual === null && expected === null;
  }

  return normalizeDateValue(actual)?.getTime() === Date.parse(expected);
}

function normalizeDateValue(value: Date | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceMatches(actual: string, expected: string) {
  return expected === "" || actual === expected;
}

function sourcePathMatches(
  actual: string | null,
  expected: SourcePathExpectation | undefined,
): boolean {
  if (!expected) {
    return true;
  }

  if (typeof expected !== "string") {
    return expected.some((candidate) => sourcePathMatches(actual, candidate));
  }

  const normalizedActual = actual?.toLowerCase();
  const normalizedExpected = expected.toLowerCase();

  return Boolean(
    actual === expected ||
    actual?.startsWith(`${expected}.`) ||
    actual?.startsWith(`${expected}[`) ||
    normalizedActual === normalizedExpected ||
    normalizedActual?.startsWith(`${normalizedExpected}.`) ||
    normalizedActual?.startsWith(`${normalizedExpected}[`) ||
    (normalizedExpected?.startsWith("line ") &&
      normalizedActual?.includes(normalizedExpected)),
  );
}

function looseTextMatches(actual: string, expected: string) {
  return (
    expected === "" ||
    normalizeText(actual).toLowerCase() ===
      normalizeText(expected).toLowerCase()
  );
}

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function textEqual(actual: string | null, expected: string) {
  return normalizeText(actual ?? "") === normalizeText(expected);
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function loadLocalEnv() {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }

  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

function configuredLogLevel() {
  return parseLogLevel(process.env.LOG_LEVEL);
}
