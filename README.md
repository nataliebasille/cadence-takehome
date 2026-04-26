# Cadence Take-Home

TypeScript starter project for the Cadence engineering take-home assignment.

## Setup

```sh
npm install
```

Create a local `.env` file from `.env.example` and add your OpenAI API key.

## Scripts

```sh
pnpm dev brucia_waynwright
pnpm eval
pnpm test
```

## CLI

Run the main triage CLI with a patient folder name:

```sh
pnpm dev brucia_waynwright
```

By default, the CLI returns only the normalized pre-op scheduling rules-engine input:

```sh
pnpm dev brucia_waynwright
```

Audit mode runs that normalized output through the deterministic rules engine and includes the verification result.

```sh
pnpm dev brucia_waynwright --audit
```

You can also pass a patient JSON path and optionally override the OpenAI model:

```sh
pnpm dev patients/brucia_waynwright/patient.json --model gpt-5.4-mini
```

Diagnostic logs are hidden by default. Use `--log-level error|warn|info|debug`
or set `LOG_LEVEL` to show them:

```sh
pnpm dev brucia_waynwright --log-level info
```

## Reliability Design

The triage flow separates normalization from policy decisions:

- The LLM is constrained to a typed JSON schema for normalized patient/procedure fields and evidence.
- The normalizer does not emit `decision`, `issues`, recommendations, or explanations.
- A deterministic rules engine evaluates the normalized payload for procedure date/risk, latest vitals, H&P, consent, CBC/CMP, active anticoagulants, and plan evidence.
- Audit mode runs the normalized model output through the deterministic rules engine.

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
