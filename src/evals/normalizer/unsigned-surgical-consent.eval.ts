import { defineInlineNormalizerEval } from "./+helpers.ts";

defineInlineNormalizerEval(
  "pre-op normalizer marks unsigned surgical consent",
  {
    name: "unsigned_surgical_consent",
    patientInput: `
Source system: Outside Pre-op Fax Packet
Submission received at: 2026-11-01T14:15:00Z

Patient
- ID: outside-unsigned-consent-001
- MRN: EXT-91201
- DOB: 1958-02-13
- Sex: F

Procedure
- Case ID: outside-case-unsigned-consent
- Procedure type: Elective knee arthroscopy
- Risk: LOW
- Procedure date: 2026-11-18
- Elective: true
- Location: Lakeside Orthopedic ASC

Vitals
- Blood pressure: 122/78 measured 2026-10-31T09:30:00Z, source Outside pre-op clinic
- Temperature: 98.3 F measured 2026-10-31T09:35:00Z, source Outside pre-op clinic

Labs
- CBC final, effective 2026-10-30T07:15:00Z, source Outside Lab

Medications
- lisinopril, active

Documents
- History and Physical, date 2026-10-31, source Outside surgeon note:
  HISTORY AND PHYSICAL: pre-op evaluation complete for elective knee arthroscopy.
- Surgical Consent, date 2026-11-01, source Outside consent form:
  Surgical consent reviewed with patient for knee arthroscopy. Signature pending; form is not signed.
`,
  },
  {
    patient: {
      id: "outside-unsigned-consent-001",
      mrn: "EXT-91201",
      dob: "1958-02-13",
      sex: "F",
    },
    procedure: {
      caseId: "outside-case-unsigned-consent",
      type: "Elective knee arthroscopy",
      risk: "LOW",
      date: "2026-11-18",
      isElective: true,
      location: "Lakeside Orthopedic ASC",
    },
    latestBloodPressure: {
      type: "blood_pressure",
      systolic: 122,
      diastolic: 78,
      date: "2026-10-31T09:30:00Z",
      source: "Outside pre-op clinic",
    },
    latestTemperature: {
      type: "temperature",
      value_f: 98.3,
      date: "2026-10-31T09:35:00Z",
      source: "Outside pre-op clinic",
    },
    latestCbc: {
      id: null,
      code: "CBC",
      effective_at: "2026-10-30T07:15:00Z",
      status: "final",
      source: "Outside Lab",
    },
    latestCmp: undefined,
    historyAndPhysical: {
      doc_id: null,
      type: "History and Physical",
      date: "2026-10-31",
      text: "",
    },
    surgicalConsent: {
      doc_id: null,
      type: "Surgical Consent",
      date: "2026-11-01",
      text: "",
      isSigned: false,
    },
    medicationPlan: undefined,
    activeAnticoagulants: [],
    metadata: {
      submissionReceivedAt: "2026-11-01T14:15:00Z",
      sourceSystem: "Outside Pre-op Fax Packet",
    },
  },
);
