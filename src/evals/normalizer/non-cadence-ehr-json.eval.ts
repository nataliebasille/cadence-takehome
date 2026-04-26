import { defineInlineNormalizerEval } from "./+helpers.ts";

defineInlineNormalizerEval(
  "pre-op normalizer maps non-Cadence EHR JSON",
  {
    name: "non_cadence_ehr_json",
    patientInput: {
      sourceSystemName: "Community EHR Export",
      receivedAt: "2026-08-05T18:05:00Z",
      person: {
        externalId: "community-json-007",
        medicalRecordNumber: "COMM-7788",
        birthDate: "1961-11-14",
        administrativeSex: "M",
      },
      scheduledCase: {
        id: "community-case-77",
        name: "Elective shoulder arthroscopy",
        acuityRisk: "LOW",
        scheduledDate: "2026-08-22",
        elective: true,
        facility: "Community Orthopedic ASC",
      },
      observations: [
        {
          kind: "bloodPressure",
          systolicValue: 126,
          diastolicValue: 74,
          observedAt: "2026-08-03T13:20:00Z",
          recordedBy: "Community pre-op clinic",
        },
        {
          kind: "temperatureF",
          value: 98.2,
          observedAt: "2026-08-03T13:25:00Z",
          recordedBy: "Community pre-op clinic",
        },
      ],
      diagnosticResults: [
        {
          accession: "COMM-CBC-77",
          panel: "CBC",
          resultStatus: "final",
          collectedAt: "2026-08-01T06:15:00Z",
          performingLab: "Community Hospital Lab",
        },
      ],
      medicationList: [
        {
          displayName: "clopidogrel",
          status: "active",
        },
        {
          displayName: "rosuvastatin",
          status: "active",
        },
      ],
      chartDocuments: [
        {
          identifier: "COMM-HNP-77",
          title: "History and Physical",
          serviceDate: "2026-08-02",
          body: "HISTORY AND PHYSICAL: pre-op evaluation complete for elective shoulder arthroscopy.",
        },
        {
          identifier: "COMM-CONSENT-77",
          title: "Surgical Consent",
          serviceDate: "2026-08-04",
          body: "Consent signed for elective shoulder arthroscopy.",
        },
        {
          identifier: "COMM-MEDPLAN-77",
          title: "Perioperative Medication Plan",
          serviceDate: "2026-08-04",
          body: "Patient takes clopidogrel. Hold clopidogrel 5 days before surgery. Restart clopidogrel 24 hours after surgery unless surgeon instructs otherwise.",
        },
      ],
    },
  },
  {
    patient: {
      id: "community-json-007",
      mrn: "COMM-7788",
      dob: "1961-11-14",
      sex: "M",
    },
    procedure: {
      caseId: "community-case-77",
      type: "Elective shoulder arthroscopy",
      risk: "LOW",
      date: "2026-08-22",
      isElective: true,
      location: "Community Orthopedic ASC",
    },
    latestBloodPressure: {
      type: "blood_pressure",
      systolic: 126,
      diastolic: 74,
      date: "2026-08-03T13:20:00Z",
      source: "",
    },
    latestTemperature: {
      type: "temperature",
      value_f: 98.2,
      date: "2026-08-03T13:25:00Z",
      source: "",
    },
    latestCbc: {
      id: "COMM-CBC-77",
      code: "CBC",
      effective_at: "2026-08-01T06:15:00Z",
      status: null,
      source: "",
    },
    latestCmp: undefined,
    historyAndPhysical: {
      doc_id: "COMM-HNP-77",
      type: "History and Physical",
      date: "2026-08-02",
      text: "",
    },
    surgicalConsent: {
      doc_id: "COMM-CONSENT-77",
      type: "Surgical Consent",
      date: "2026-08-04",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: "COMM-MEDPLAN-77",
      type: "Perioperative Medication Plan",
      date: "2026-08-04",
      text: "",
    },
    activeAnticoagulants: ["clopidogrel"],
    metadata: {
      submissionReceivedAt: "2026-08-05T18:05:00Z",
      sourceSystem: "Community EHR Export",
    },
  },
);
