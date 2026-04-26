import { defineInlineNormalizerEval } from "./+helpers.ts";

defineInlineNormalizerEval(
  "pre-op normalizer maps non-Cadence narrative text",
  {
    name: "non_cadence_narrative_text",
    patientInput:
      "Outside surgical clearance narrative received from Valley Surgical Group on 2026-09-03T16:45:00Z. The source system is Valley Surgical Group Letter. Patient external id valley-text-314, MRN VAL-9314, date of birth 1949-01-09, sex F. The patient is scheduled for an elective total hip arthroplasty, case valley-case-314, at Valley Orthopedic Hospital on 2026-09-25. The procedure risk is HIGH. At pre-op clinic on 2026-09-02T10:10:00Z, blood pressure was 132/84 and temperature was 98.6 F. CBC was final from Valley Lab, collected 2026-09-01T07:10:00Z. CMP was final from Valley Lab, collected 2026-09-01T07:20:00Z. Active medications include warfarin and carvedilol. History and Physical dated 2026-09-02 states: HISTORY AND PHYSICAL: pre-op evaluation complete for elective total hip arthroplasty. Surgical Consent dated 2026-09-03 states: Patient signed surgical consent for total hip arthroplasty. Cardiology medication plan dated 2026-09-03 states: Patient takes warfarin. Hold warfarin five days before surgery and resume warfarin after procedure when cleared by surgeon.",
  },
  {
    patient: {
      id: "valley-text-314",
      mrn: "VAL-9314",
      dob: "1949-01-09",
      sex: "F",
    },
    procedure: {
      caseId: "valley-case-314",
      type: "Elective total hip arthroplasty",
      risk: "HIGH",
      date: "2026-09-25",
      isElective: true,
      location: "Valley Orthopedic Hospital",
    },
    latestBloodPressure: {
      type: "blood_pressure",
      systolic: 132,
      diastolic: 84,
      date: "2026-09-02T10:10:00Z",
      source: "",
    },
    latestTemperature: {
      type: "temperature",
      value_f: 98.6,
      date: "2026-09-02T10:10:00Z",
      source: "",
    },
    latestCbc: {
      id: null,
      code: "CBC",
      effective_at: "2026-09-01T07:10:00Z",
      status: null,
      source: "",
    },
    latestCmp: {
      id: null,
      code: "CMP",
      effective_at: "2026-09-01T07:20:00Z",
      status: null,
      source: "",
    },
    historyAndPhysical: {
      doc_id: null,
      type: "History and Physical",
      date: "2026-09-02",
      text: "",
    },
    surgicalConsent: {
      doc_id: null,
      type: "Surgical Consent",
      date: "2026-09-03",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: null,
      type: "Cardiology medication plan",
      date: "2026-09-03",
      text: "",
    },
    activeAnticoagulants: ["warfarin"],
    metadata: {
      submissionReceivedAt: "2026-09-03T16:45:00Z",
      sourceSystem: "",
    },
  },
);
