import { defineNormalizeForPatientTextEval } from "./+helpers.ts";

defineNormalizeForPatientTextEval("tex_phile", {
  patient: {
    id: "tex-phile-2026-001",
    mrn: "TXT-4242",
    dob: "1968-02-14",
    sex: "F",
  },
  procedure: {
    caseId: "tex-case-4242",
    type: "Elective total hip arthroplasty",
    risk: "HIGH",
    date: "2026-05-20",
    isElective: true,
    location: "Northstar Orthopedic Hospital",
  },
  latestBloodPressure: {
    type: "blood_pressure",
    systolic: 126,
    diastolic: 78,
    date: "2026-05-08T09:10:00Z",
    source: "Northstar pre-op clinic",
  },
  latestTemperature: {
    type: "temperature",
    value_f: 98.2,
    date: "2026-05-08T09:12:00Z",
    source: "Northstar pre-op clinic",
  },
  latestCbc: {
    id: null,
    code: "CBC",
    effective_at: "2026-05-10T07:30:00Z",
    status: "final",
    source: "Northstar Lab",
  },
  latestCmp: {
    id: null,
    code: "CMP",
    effective_at: "2026-05-10T07:45:00Z",
    status: "final",
    source: "Northstar Lab",
  },
  historyAndPhysical: {
    doc_id: null,
    type: "History and Physical",
    date: "2026-05-08",
    text: "",
  },
  surgicalConsent: {
    doc_id: null,
    type: "Surgical Consent",
    date: "2026-05-09",
    text: "",
    isSigned: true,
  },
  medicationPlan: {
    doc_id: null,
    type: "Perioperative Anticoagulation Plan",
    date: "2026-05-09",
    text: "",
  },
  activeAnticoagulants: ["warfarin"],
  anticoagulationPlan: {
    present: true,
    hasPreProcedureInstruction: true,
    hasPostProcedureInstruction: true,
    planIsDocumentedAsMissingOrIncomplete: false,
    planMissingOrIncompleteReason: null,
  },
  metadata: {
    submissionReceivedAt: "2026-05-01T14:25:00Z",
    sourceSystem: "Textual Healing Fax Packet",
  },
  sourcePaths: {
    patient: ["line 4", "line 5"],
    procedure: ["line 11", "line 12", "line 13"],
    latestBloodPressure: "line 20",
    latestTemperature: "line 21",
    latestCbc: "line 24",
    latestCmp: "line 25",
    historyAndPhysical: ["line 32", "line 33"],
    surgicalConsent: ["line 34", "line 35"],
    medicationPlan: ["line 36", "line 37"],
    activeAnticoagulants: [
      {
        name: "warfarin",
        sourcePath: "line 28",
      },
    ],
  },
});
