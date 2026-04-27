import { defineInlineNormalizerEval } from "./+helpers.ts";

defineInlineNormalizerEval(
  "pre-op normalizer selects latest temperature and lab reports",
  {
    name: "latest_vitals_and_labs",
    patientInput: {
      sourceSystemName: "Multi-Report EHR Export",
      receivedAt: "2026-11-12T18:00:00Z",
      person: {
        externalId: "latest-reports-001",
        medicalRecordNumber: "MULTI-9001",
        birthDate: "1958-06-18",
        administrativeSex: "F",
      },
      scheduledCase: {
        id: "latest-case-9001",
        name: "Elective total knee arthroplasty",
        acuityRisk: "HIGH",
        scheduledDate: "2026-11-25",
        elective: true,
        facility: "Riverside Orthopedic Hospital",
      },
      observations: [
        {
          kind: "bloodPressure",
          systolicValue: 134,
          diastolicValue: 82,
          observedAt: "2026-11-10T08:55:00Z",
          recordedBy: "Riverside pre-op clinic",
        },
        {
          kind: "temperatureF",
          value: 99.1,
          observedAt: "2026-11-09T08:58:00Z",
          recordedBy: "Riverside pre-op clinic",
        },
        {
          kind: "temperatureF",
          value: 98.6,
          observedAt: "2026-11-10T08:57:00Z",
          recordedBy: "Riverside pre-op clinic",
        },
        {
          kind: "temperatureF",
          value: 100.2,
          observedAt: "2026-11-01T14:20:00Z",
          recordedBy: "Urgent care intake",
        },
      ],
      diagnosticResults: [
        {
          accession: "RIV-CBC-OLD",
          panel: "CBC",
          resultStatus: "final",
          collectedAt: "2026-11-03T07:15:00Z",
          performingLab: "Riverside Lab",
        },
        {
          accession: "RIV-CMP-OLD",
          panel: "CMP",
          resultStatus: "final",
          collectedAt: "2026-11-02T07:30:00Z",
          performingLab: "Riverside Lab",
        },
        {
          accession: "RIV-CBC-LATEST",
          panel: "CBC",
          resultStatus: "final",
          collectedAt: "2026-11-11T07:05:00Z",
          performingLab: "Riverside Lab",
        },
        {
          accession: "RIV-CMP-LATEST",
          panel: "CMP",
          resultStatus: "final",
          collectedAt: "2026-11-11T07:20:00Z",
          performingLab: "Riverside Lab",
        },
      ],
      medicationList: [
        {
          displayName: "warfarin",
          status: "active",
        },
        {
          displayName: "amlodipine",
          status: "active",
        },
      ],
      chartDocuments: [
        {
          identifier: "RIV-HNP-9001",
          title: "History and Physical",
          serviceDate: "2026-11-10",
          body: "HISTORY AND PHYSICAL: pre-op evaluation complete for elective total knee arthroplasty.",
        },
        {
          identifier: "RIV-CONSENT-9001",
          title: "Surgical Consent",
          serviceDate: "2026-11-10",
          body: "Surgical consent signed by patient for total knee arthroplasty.",
        },
        {
          identifier: "RIV-MEDPLAN-9001",
          title: "Perioperative Medication Plan",
          serviceDate: "2026-11-11",
          body: "Patient takes warfarin. Hold warfarin five days before surgery. Resume warfarin after procedure when cleared by surgeon.",
        },
      ],
    },
  },
  {
    patient: {
      id: "latest-reports-001",
      mrn: "MULTI-9001",
      dob: "1958-06-18",
      sex: "F",
    },
    procedure: {
      caseId: "latest-case-9001",
      type: "Elective total knee arthroplasty",
      risk: "HIGH",
      date: "2026-11-25",
      isElective: true,
      location: "Riverside Orthopedic Hospital",
    },
    latestBloodPressure: {
      type: "blood_pressure",
      systolic: 134,
      diastolic: 82,
      date: "2026-11-10T08:55:00Z",
      source: "Riverside pre-op clinic",
    },
    latestTemperature: {
      type: "temperature",
      value_f: 98.6,
      date: "2026-11-10T08:57:00Z",
      source: "Riverside pre-op clinic",
    },
    latestCbc: {
      id: "RIV-CBC-LATEST",
      code: "CBC",
      effective_at: "2026-11-11T07:05:00Z",
      status: null,
      source: "",
    },
    latestCmp: {
      id: "RIV-CMP-LATEST",
      code: "CMP",
      effective_at: "2026-11-11T07:20:00Z",
      status: null,
      source: "",
    },
    historyAndPhysical: {
      doc_id: "RIV-HNP-9001",
      type: "History and Physical",
      date: "2026-11-10",
      text: "",
    },
    surgicalConsent: {
      doc_id: "RIV-CONSENT-9001",
      type: "Surgical Consent",
      date: "2026-11-10",
      text: "",
      isSigned: true,
    },
    medicationPlan: {
      doc_id: "RIV-MEDPLAN-9001",
      type: "Perioperative Medication Plan",
      date: "2026-11-11",
      text: "",
    },
    activeAnticoagulants: ["warfarin"],
    metadata: {
      submissionReceivedAt: "2026-11-12T18:00:00Z",
      sourceSystem: "Multi-Report EHR Export",
    },
  },
);
