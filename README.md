# Cadence Take-Home

This project started from a simple idea: let the LLM do the part that is
actually hard to hand-code, then keep the final decision out of the model.

The LLM reads the incoming patient packet, pulls out the facts the scheduling
policy needs, and normalizes them into one canonical shape. After that, a
regular TypeScript rules engine decides whether the patient is ready, needs
follow-up, or should not be cleared.

I built it this way so the system is not tied to one format, such as Cadence API
v2. The same normalizer can handle Cadence-style JSON, non-Cadence JSON, and
plain text. The plain-text path is included on purpose because it is a good
stand-in for the kind of messy packet data teams actually have to deal with:
fax notes, pasted chart summaries, exported EHR blobs, and vendor-specific
payloads. Once those inputs are normalized, the policy code does not have to
care where they came from.

## Table of Contents

- [Quick Run](#quick-run)
- [Requirements](#requirements)
- [Setup](#setup)
- [Scripts](#scripts)
- [CLI](#cli)
- [Adding a Patient Fixture](#adding-a-patient-fixture)
- [Design Decisions](#design-decisions)
- [Reliability Design](#reliability-design)
- [Evals](#evals)
- [Project Structure](#project-structure)

## Quick Run

```sh
pnpm install
cp .env.example .env
pnpm run cli brucia_waynwright
```

Add your OpenAI API key to `.env` before running the CLI.

## Design Decisions

### LLM as Normalization Layer

The LLM is used as a structured extraction and normalization layer, not as the
source of truth for the final decision. It converts arbitrary patient input into
a typed rules-engine payload containing procedure details, risk, vitals, labs,
documents, anticoagulants, plan evidence, and source references.

That design creates a useful adapter boundary:

- Cadence API v2 JSON is supported, but it is not hard-coded as the only source
  shape.
- Plain-text packets are treated as first-class input. The included plain-text
  fixture and normalizer evals demonstrate that a fax-packet style note can be
  normalized into the same rule input as structured JSON.
- Non-Cadence JSON can be passed directly to the CLI so new upstream formats can
  be evaluated without building a custom parser first.
- JSON payloads are encoded with [TOON](https://toonade.com/docs) before they
  are sent to the model, which keeps the prompt more compact than pretty-printed
  JSON while preserving the structure the normalizer needs.
- The normalizer preserves source paths, raw values, and evidence excerpts so
  downstream decisions remain explainable instead of becoming opaque model
  output.

### Deterministic Rules Over Normalized Input

The rules engine consumes only the canonical normalized payload. This separates
clinical policy from prompt behavior:

- New policy rules can be added as TypeScript modules without changing the LLM
  prompt.
- Existing rules can be tested with ordinary unit tests because they do not call
  the model.
- The final `READY`, `NEEDS_FOLLOW_UP`, or `NOT_CLEARED` decision is more
  deterministic than it would be if the LLM made the decision directly.
- If the model starts extracting facts differently, the normalizer evals should
  catch that before bad inputs quietly flow into the rules engine.

The LLM is explicitly instructed not to emit decisions, issues,
recommendations, explanations, or policy conclusions. It extracts facts; the
rules engine applies policy.

### Evidence-First Output

Rules return structured issues, categories, explanations, and evidence. The
runner de-duplicates supporting evidence and carries source references from the
normalizer into the final result. This gives the CLI output a reviewable audit
trail: a user can see not only what the system decided, but which extracted
facts and documents drove that decision.

### Observability and Evaluation

The project includes a small logging abstraction with configurable
`--log-level` support, model override support, and Evalite normalizer evals.
Those pieces make the system easier to operate and improve:

- `--log-level info|debug` can expose normalization diagnostics during local
  investigation without cluttering default CLI output.
- `--model` and `OPENAI_MODEL` make it easy to compare model behavior without
  changing application code.
- Evalite cases exercise structured Cadence fixtures, non-Cadence JSON,
  narrative text, and plain-text packet inputs through the real LLM normalizer.
- Deterministic unit tests cover rule behavior independently from model calls.

The result is a system that can evolve in two controlled loops: improve
normalization with evals, and improve policy with deterministic rules and unit
tests.

## Requirements

To run the project locally, you need:

- Node.js 20 or newer.
- pnpm 10.19.0 or newer. The repo includes a `packageManager` entry and
  `pnpm-lock.yaml`.
- An OpenAI API key in a local `.env` file.

The `.env` file should contain:

```sh
OPENAI_API_KEY=your_api_key_here
```

## Setup

```sh
pnpm install
```

Create a local `.env` file from `.env.example` and add your OpenAI API key:

```sh
cp .env.example .env
```

## Scripts

| Command                      | Description                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm run cli brucia_waynwright` | Runs the CLI against the `patients/brucia_waynwright` fixture.                             |
| `pnpm run cli <patient-or-path>` | Runs the CLI against a patient fixture folder, a `.json` file, or a `.txt` patient packet. |
| `pnpm eval`                  | Runs the Evalite normalizer evals against the configured OpenAI model.                     |
| `pnpm test`                  | Runs the Vitest unit test suite, including deterministic rules-engine tests.               |
| `pnpm typecheck`             | Runs TypeScript without emitting files.                                                    |
| `pnpm build`                 | Compiles the TypeScript project into `dist/`.                                              |
| `pnpm start`                 | Runs the compiled app from `dist/main.js`. Run `pnpm build` first.                         |
| `pnpm lint`                  | Runs ESLint across the repo.                                                               |
| `pnpm format`                | Formats the repo with Prettier.                                                            |
| `pnpm format:check`          | Checks Prettier formatting without changing files.                                         |

## CLI

Run the main triage CLI with a patient folder name:

```sh
pnpm run cli brucia_waynwright
```

The CLI now treats plain-text packets as first-class patient input. It accepts:

- a patient folder under `patients/` containing `patient.txt`
- a direct path to a `.txt` patient packet
- the existing `patient.json` fixtures for compatibility

## Adding a Patient Fixture

The runner is not limited to the Cadence API v2 patient format. You can test:

- a plain-text fixture in `patients/<name>/patient.txt`
- a Cadence API v2-style fixture in `patients/<name>/patient.json`
- a non-Cadence JSON or text payload from any location, passed by direct file path

Use the folder-name shortcut for local fixtures. Use a direct file path when you
want to test exported EHR JSON, vendor payloads, fax packet text, synthetic
cases, or any other patient data shape that does not match Cadence API v2.

### Option 1: Plain-Text Patient Packet

To add a new text patient case:

1. Create a new folder in `patients/` using a stable snake_case name:

   ```text
   patients/tex_phile/
   ```

2. Add a `patient.txt` file inside that folder:

   ```text
   patients/tex_phile/patient.txt
   ```

3. Run the new case by folder name:

   ```sh
   pnpm run cli tex_phile
   ```

The included demo fixture is `patients/tex_phile/patient.txt`. It is an
outside fax-packet style note for Tex Phile, a high-risk elective hip
arthroplasty patient with current vitals, CBC/CMP, signed consent, H&P, and a
documented warfarin plan.

You can also pass a text file directly:

```sh
pnpm run cli path/to/patient-packet.txt
```

When a direct `.txt` file is used, the CLI writes a reusable copy to
`patients/<text-file-name>/patient.txt` so the same patient can be run later by
folder name.

### Option 2: Cadence API v2-Style Fixture

To add a new Cadence-style patient case:

1. Create a new folder in `patients/` using a stable snake_case name:

   ```text
   patients/jane_example/
   ```

2. Add a `patient.json` file inside that folder:

   ```text
   patients/jane_example/patient.json
   ```

3. Run the new case by folder name:

   ```sh
   pnpm run cli jane_example
   ```

   You can also run it by JSON path:

   ```sh
   pnpm run cli patients/jane_example/patient.json
   ```

If the folder name is not found, the CLI prints the available patient fixture
folders under `patients/`.

### Option 3: Non-Cadence JSON Payload

To test a patient file that does not use the Cadence API v2 shape, pass the JSON
file path directly:

```sh
pnpm run cli path/to/non-cadence-patient.json
```

This direct-path mode is intentionally format-flexible so you can exercise the
normalizer against non-Cadence source data.

By default, the CLI runs normalization and deterministic policy verification:

```sh
pnpm run cli brucia_waynwright
```

You can also pass a patient text or JSON path and optionally override the OpenAI model:

```sh
pnpm run cli patients/brucia_waynwright/patient.json --model gpt-5.4-mini
```

Diagnostic logs are hidden by default. Use `--log-level error|warn|info|debug`
or set `LOG_LEVEL` to show them:

```sh
pnpm run cli brucia_waynwright --log-level info
```

## Reliability Design

The triage flow separates normalization from policy decisions:

- The LLM is constrained to a typed JSON schema for normalized patient/procedure fields and evidence.
- The normalizer does not emit `decision`, `issues`, recommendations, or explanations.
- A deterministic rules engine evaluates the normalized payload for procedure date/risk, latest vitals, H&P, consent, CBC/CMP, active anticoagulants, and plan evidence.
- Rules return structured issue categories and evidence, keeping final output traceable to normalized source facts.

## Evals

Evalite is configured for TypeScript eval files with in-memory storage in `evalite.config.ts`; no dashboard service, database, Docker service, or YAML config is required.

Normalizer evals live in `src/evals/normalizer/*.eval.ts`, with one eval file per patient fixture plus non-Cadence JSON, packet text, and narrative text input cases. They run each case through the real Vercel AI SDK/OpenAI normalizer and score the normalized rule input against deterministic expectations.

Run `pnpm eval` to execute them locally against the configured OpenAI model. You can override the model with:

```sh
OPENAI_MODEL=gpt-5.4-mini pnpm eval
```

Application call sites choose the model/provider through the local LLM client:

```ts
const aiClient = createLlmClient(
  createOpenAIModel({
    apiKey: config.openAIApiKey,
    model: "gpt-5.4-mini",
  }),
);

const normalizedRuleInput = await preOpSchedulingTriager(patient, { aiClient });
const rulesResult = verifyPreOpSchedulingPolicy(normalizedRuleInput);
```

The triager itself only normalizes, and the rules engine consumes the normalized payload.

## Project Structure

```text
src/
  main.ts         Application entry point
  engine/         Prompt triager and deterministic policy verifier
  evals/          Evalite eval files
  lib/
    ai/           LLM provider/client abstraction
  types/          Patient, triage, and rules-engine schemas
tests/            Add tests here as needed
```
