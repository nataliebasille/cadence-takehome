import { defineInlineNormalizerEval } from "./+helpers.ts";

defineInlineNormalizerEval(
  "pre-op normalizer leaves plan missing reason null for complete plan",
  {
    name: "complete_anticoagulation_plan_reason_null",
    patientInput: {
      patient: {
        id: "5ee6e8a5-2f9b-50be-a4a0-450ebdf20b01",
        mrn: "PLAN-001",
        name: {
          given: "Clara",
          family: "Complete",
        },
        dob: "1950-01-10",
        sex: "F",
      },
      procedure: {
        case_id: "plan-case-001",
        procedure_type: "Elective total knee arthroplasty",
        procedure_risk: "HIGH",
        procedure_date: "2026-10-20",
        is_elective: true,
        location: "Focused Orthopedic Hospital",
      },
      vitals: [],
      labs: [],
      medications: [{ name: "warfarin", active: true }],
      conditions: [{ name: "Atrial fibrillation", active: true }],
      documents: [
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290001",
          type: "History and Physical",
          date: "2026-09-30",
          author: "Rina Hale, MD",
          text: "HISTORY AND PHYSICAL: pre-op evaluation complete for elective total knee arthroplasty scheduled 2026-10-20. Patient denies fever, chest pain, or new shortness of breath.",
        },
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290002",
          type: "Surgical Consent",
          date: "2026-10-01",
          author: "Milo Grant, DO",
          text: "Electronic consent obtained and signed by patient for elective total knee arthroplasty.",
        },
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290003",
          type: "Perioperative Medication Plan",
          date: "2026-10-01",
          author: "Leah Stone, PharmD",
          text: "Patient takes warfarin. Hold warfarin 5 days before surgery. Resume warfarin after procedure when cleared by surgeon.",
        },
      ],
      metadata: {
        submission_received_at: "2026-10-01T15:30:00Z",
        source_system: "Cadence Intake API v2",
      },
    },
  },
  {
    patient: {
      id: "5ee6e8a5-2f9b-50be-a4a0-450ebdf20b01",
      mrn: "PLAN-001",
      dob: "1950-01-10",
      sex: "F",
    },
    procedure: {
      caseId: "plan-case-001",
      type: "Elective total knee arthroplasty",
      risk: "HIGH",
      date: "2026-10-20",
      isElective: true,
      location: "Focused Orthopedic Hospital",
    },
    latestBloodPressure: undefined,
    latestTemperature: undefined,
    latestCbc: undefined,
    latestCmp: undefined,
    historyAndPhysical: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290001",
      type: "History and Physical",
      date: "2026-09-30",
      text: "",
    },
    surgicalConsent: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290002",
      type: "Surgical Consent",
      date: "2026-10-01",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290003",
      type: "Perioperative Medication Plan",
      date: "2026-10-01",
      text: "",
    },
    activeAnticoagulants: ["warfarin"],
    metadata: {
      submissionReceivedAt: "2026-10-01T15:30:00Z",
      sourceSystem: "Cadence Intake API v2",
    },
    anticoagulationPlan: {
      present: true,
      hasPreProcedureInstruction: true,
      hasPostProcedureInstruction: true,
      planIsDocumentedAsMissingOrIncomplete: false,
      planMissingOrIncompleteReason: null,
    },
  },
);

defineInlineNormalizerEval(
  "pre-op normalizer extracts reason when plan is documented as absent",
  {
    name: "absent_anticoagulation_plan_reason",
    patientInput: {
      patient: {
        id: "5ee6e8a5-2f9b-50be-a4a0-450ebdf20b02",
        mrn: "PLAN-002",
        name: {
          given: "Abel",
          family: "Absent",
        },
        dob: "1948-03-14",
        sex: "M",
      },
      procedure: {
        case_id: "plan-case-002",
        procedure_type: "Elective lumbar fusion",
        procedure_risk: "HIGH",
        procedure_date: "2026-10-22",
        is_elective: true,
        location: "Focused Spine Center",
      },
      vitals: [],
      labs: [],
      medications: [{ name: "apixaban", active: true }],
      conditions: [{ name: "Atrial fibrillation", active: true }],
      documents: [
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290011",
          type: "History and Physical",
          date: "2026-10-01",
          author: "Rina Hale, MD",
          text: "Pre-op evaluation complete for elective lumbar fusion.",
        },
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290012",
          type: "Surgical Consent",
          date: "2026-10-02",
          author: "Milo Grant, DO",
          text: "Consent signed for lumbar fusion.",
        },
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290013",
          type: "Perioperative Medication Plan",
          date: "2026-10-02",
          author: "Leah Stone, PharmD",
          text: "Patient takes apixaban. Anticoagulation plan is missing from the packet; no hold or restart instructions are documented.",
        },
      ],
      metadata: {
        submission_received_at: "2026-10-02T15:30:00Z",
        source_system: "Cadence Intake API v2",
      },
    },
  },
  {
    patient: {
      id: "5ee6e8a5-2f9b-50be-a4a0-450ebdf20b02",
      mrn: "PLAN-002",
      dob: "1948-03-14",
      sex: "M",
    },
    procedure: {
      caseId: "plan-case-002",
      type: "Elective lumbar fusion",
      risk: "HIGH",
      date: "2026-10-22",
      isElective: true,
      location: "Focused Spine Center",
    },
    latestBloodPressure: undefined,
    latestTemperature: undefined,
    latestCbc: undefined,
    latestCmp: undefined,
    historyAndPhysical: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290011",
      type: "History and Physical",
      date: "2026-10-01",
      text: "",
    },
    surgicalConsent: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290012",
      type: "Surgical Consent",
      date: "2026-10-02",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290013",
      type: "Perioperative Medication Plan",
      date: "2026-10-02",
      text: "",
    },
    activeAnticoagulants: ["apixaban"],
    metadata: {
      submissionReceivedAt: "2026-10-02T15:30:00Z",
      sourceSystem: "Cadence Intake API v2",
    },
    anticoagulationPlan: {
      present: true,
      hasPreProcedureInstruction: false,
      hasPostProcedureInstruction: false,
      planIsDocumentedAsMissingOrIncomplete: true,
      planMissingOrIncompleteReason: {
        excerptIncludes: ["plan is missing", "no hold or restart"],
        sourcePathIncludes: "documents",
      },
    },
  },
);

defineInlineNormalizerEval(
  "pre-op normalizer extracts reason when plan is incomplete",
  {
    name: "incomplete_anticoagulation_plan_reason",
    patientInput: {
      patient: {
        id: "5ee6e8a5-2f9b-50be-a4a0-450ebdf20b03",
        mrn: "PLAN-003",
        name: {
          given: "Ina",
          family: "Incomplete",
        },
        dob: "1955-08-09",
        sex: "F",
      },
      procedure: {
        case_id: "plan-case-003",
        procedure_type: "Elective colectomy",
        procedure_risk: "HIGH",
        procedure_date: "2026-10-24",
        is_elective: true,
        location: "Focused Surgical Hospital",
      },
      vitals: [],
      labs: [],
      medications: [{ name: "rivaroxaban", active: true }],
      conditions: [{ name: "History of venous thromboembolism", active: true }],
      documents: [
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290021",
          type: "History and Physical",
          date: "2026-10-02",
          author: "Rina Hale, MD",
          text: "Pre-op evaluation complete for elective colectomy.",
        },
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290022",
          type: "Surgical Consent",
          date: "2026-10-03",
          author: "Milo Grant, DO",
          text: "Consent signed for colectomy.",
        },
        {
          doc_id: "4967e493-feb3-5950-a35d-89f2fb290023",
          type: "Perioperative Medication Plan",
          date: "2026-10-03",
          author: "Leah Stone, PharmD",
          text: "Patient takes rivaroxaban. Hold rivaroxaban 48 hours before procedure. Restart timing is not documented and remains incomplete pending surgeon guidance.",
        },
      ],
      metadata: {
        submission_received_at: "2026-10-03T15:30:00Z",
        source_system: "Cadence Intake API v2",
      },
    },
  },
  {
    patient: {
      id: "5ee6e8a5-2f9b-50be-a4a0-450ebdf20b03",
      mrn: "PLAN-003",
      dob: "1955-08-09",
      sex: "F",
    },
    procedure: {
      caseId: "plan-case-003",
      type: "Elective colectomy",
      risk: "HIGH",
      date: "2026-10-24",
      isElective: true,
      location: "Focused Surgical Hospital",
    },
    latestBloodPressure: undefined,
    latestTemperature: undefined,
    latestCbc: undefined,
    latestCmp: undefined,
    historyAndPhysical: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290021",
      type: "History and Physical",
      date: "2026-10-02",
      text: "",
    },
    surgicalConsent: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290022",
      type: "Surgical Consent",
      date: "2026-10-03",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: "4967e493-feb3-5950-a35d-89f2fb290023",
      type: "Perioperative Medication Plan",
      date: "2026-10-03",
      text: "",
    },
    activeAnticoagulants: ["rivaroxaban"],
    metadata: {
      submissionReceivedAt: "2026-10-03T15:30:00Z",
      sourceSystem: "Cadence Intake API v2",
    },
    anticoagulationPlan: {
      present: true,
      hasPreProcedureInstruction: true,
      hasPostProcedureInstruction: false,
      planIsDocumentedAsMissingOrIncomplete: true,
      planMissingOrIncompleteReason: {
        excerptIncludes: ["restart timing", "not documented", "incomplete"],
        sourcePathIncludes: "documents",
      },
    },
  },
);
