import { describe, expect, it } from "vitest";

import {
  buildPreOpSchedulingTriagePrompt,
  formatPatientInfoForPrompt,
} from "./pre-op-scheduling-rule-input.normalizer.ts";

describe("pre-op scheduling rule input normalizer prompt", () => {
  it("numbers plain-text patient packets so source paths can cite stable lines", () => {
    expect(formatPatientInfoForPrompt("Patient\n- MRN: TXT-4242")).toBe(
      "line 1: Patient\nline 2: - MRN: TXT-4242",
    );
  });

  it("requires plain-text source paths to use line labels instead of JSON paths", () => {
    const prompt = buildPreOpSchedulingTriagePrompt("Patient\n- MRN: TXT-4242");

    expect(prompt).toContain(
      "For plain-text input, use only the numbered line label where the value appears",
    );
    expect(prompt).toContain(
      "Do not use JSON-style paths like patient, procedure, vitals[0], labs[0], documents[0], or medications[0]",
    );
    expect(prompt).toContain("line 2: - MRN: TXT-4242");
  });

  it("explains that TOON array headers are row counts, not source indexes", () => {
    const prompt = buildPreOpSchedulingTriagePrompt({
      patient: {
        id: "patient-1",
      },
      documents: [
        {
          doc_id: "doc-1",
          type: "History and Physical",
        },
        {
          doc_id: "doc-2",
          type: "Surgical Consent",
        },
      ],
    });

    expect(prompt).toContain("headers like vitals[2]");
    expect(prompt).toContain("show the number of rows in the array");
    expect(prompt).toContain("They are not sourcePath values");
    expect(prompt).toContain(
      "the first row under documents[2] is documents[0]",
    );
    expect(prompt).toContain("the second row is documents[1]");
  });
});
