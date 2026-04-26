import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { preOpSchedulingTriager } from "./engine/pre-op-scheduling-triager.js";
import { formatRunResult } from "./format-run-result.ts";
import { createLlmClient } from "./lib/ai/create-llm-client.ts";
import { createOpenAIModel } from "./lib/ai/models/openai.ts";
import { appConfig } from "./lib/config/app-config.ts";
import { createConsoleLogger, parseLogLevel } from "./lib/logger.ts";

async function main() {
  loadLocalEnv();

  const [options, config] = await Promise.all([
    parseArgs(),
    appConfig.fromEnv(process.env),
  ]);
  const patient = await loadPatient(options.patient);

  const aiClient = createLlmClient(
    createOpenAIModel({
      apiKey: config.openAIApiKey,
      model: options.model,
    }),
  );

  const result = await preOpSchedulingTriager(patient, {
    aiClient,
    logger: createConsoleLogger("cadence", { level: options.logLevel }),
    now: () => new Date(),
  });

  console.log(formatRunResult(result));
}

async function parseArgs() {
  const args = await yargs(hideBin(process.argv))
    .scriptName("cadence")
    .usage("$0 <patient> [--model <model>]")
    .command(
      "$0 <patient>",
      "Run pre-op scheduling triage for a patient",
      (yargs) =>
        yargs.positional("patient", {
          type: "string",
          demandOption: true,
          describe:
            "Patient folder under patients/ or path to a patient JSON file",
        }),
    )
    .check((args) => {
      if (args.patient === undefined) {
        throw new Error("Patient is required. Usage: pnpm dev <patient>");
      }

      return true;
    })
    .option("model", {
      alias: "m",
      type: "string",
      describe: "Optional OpenAI model override",
      default: "gpt-5.4-mini",
    })
    .option("log-level", {
      choices: ["silent", "error", "warn", "info", "debug"] as const,
      describe: "Show diagnostic logs at or above the selected level",
      default: parseLogLevel(process.env.LOG_LEVEL),
    })
    .strict()
    .help()
    .parseAsync();

  return {
    patient: args.patient as string,
    model: args.model,
    logLevel: args.logLevel,
  };
}

function loadLocalEnv() {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }

  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function loadPatient(patientArg: string) {
  const patientPath = await resolvePatientPath(patientArg);
  const rawPatient = JSON.parse(await readFile(patientPath, "utf8"));
  return rawPatient;
}

async function resolvePatientPath(patientArg: string) {
  const directPath = path.resolve(patientArg);

  if (await fileExists(directPath)) {
    return directPath;
  }

  const patientPath = path.resolve("patients", patientArg, "patient.json");

  if (await fileExists(patientPath)) {
    return patientPath;
  }

  const patients = await listAvailablePatients();
  throw new Error(
    `Unknown patient "${patientArg}". Available patients: ${patients.join(", ")}`,
  );
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listAvailablePatients() {
  const entries = await readdir("patients", { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
