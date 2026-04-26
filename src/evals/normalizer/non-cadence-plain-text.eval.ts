import { defineInlineNormalizerEval } from "./+helpers.ts";

defineInlineNormalizerEval(
  "pre-op normalizer maps non-Cadence plain text packet",
  {
    name: "non_cadence_plain_text",
    patientInput: `
Source system: Outside Pre-op Fax Packet
Submission received at: 2026-07-01T15:30:00Z

Patient
- ID: outside-text-001
- MRN: EXT-44501
- DOB: 1952-04-03
- Sex: F

Procedure
- Case ID: outside-case-9001
- Procedure type: Elective laparoscopic cholecystectomy
- Risk: MODERATE
- Procedure date: 2026-07-20
- Elective: true
- Location: Northside Ambulatory Surgery

Vitals
- Blood pressure: 148/88 measured 2026-07-01T09:15:00Z, source Outside pre-op clinic
- Temperature: 98.4 F measured 2026-07-01T09:18:00Z, source Outside pre-op clinic

Labs
- CBC final, effective 2026-06-28T07:45:00Z, source Quest Diagnostics
- CMP final, effective 2026-06-29T07:50:00Z, source Quest Diagnostics

Medications
- apixaban, active
- metoprolol, active

Documents
- History and Physical, date 2026-06-30, source Outside surgeon note:
  HISTORY AND PHYSICAL: pre-op evaluation complete for elective laparoscopic cholecystectomy.
- Surgical Consent, date 2026-07-01, source Outside consent form:
  Surgical consent signed by patient for laparoscopic cholecystectomy.
- Perioperative Medication Plan, date 2026-07-01, source cardiology fax:
  Patient takes apixaban. Hold apixaban for 48 hours before procedure. Resume apixaban the day after procedure if hemostasis is secure.
`,
  },
  {
    patient: {
      id: "outside-text-001",
      mrn: "EXT-44501",
      dob: "1952-04-03",
      sex: "F",
    },
    procedure: {
      caseId: "outside-case-9001",
      type: "Elective laparoscopic cholecystectomy",
      risk: "MODERATE",
      date: "2026-07-20",
      isElective: true,
      location: "Northside Ambulatory Surgery",
    },
    latestBloodPressure: {
      type: "blood_pressure",
      systolic: 148,
      diastolic: 88,
      date: "2026-07-01T09:15:00Z",
      source: "Outside pre-op clinic",
    },
    latestTemperature: {
      type: "temperature",
      value_f: 98.4,
      date: "2026-07-01T09:18:00Z",
      source: "Outside pre-op clinic",
    },
    latestCbc: {
      id: null,
      code: "CBC",
      effective_at: "2026-06-28T07:45:00Z",
      status: "final",
      source: "Quest Diagnostics",
    },
    latestCmp: {
      id: null,
      code: "CMP",
      effective_at: "2026-06-29T07:50:00Z",
      status: "final",
      source: "Quest Diagnostics",
    },
    historyAndPhysical: {
      doc_id: null,
      type: "History and Physical",
      date: "2026-06-30",
      text: "",
    },
    surgicalConsent: {
      doc_id: null,
      type: "Surgical Consent",
      date: "2026-07-01",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: null,
      type: "Perioperative Medication Plan",
      date: "2026-07-01",
      text: "",
    },
    activeAnticoagulants: ["apixaban"],
    metadata: {
      submissionReceivedAt: "2026-07-01T15:30:00Z",
      sourceSystem: "Outside Pre-op Fax Packet",
    },
  },
);
