import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

  const options = await parseArgs();
  const patient = await loadPatient(options.patient);
  const config = await appConfig.fromEnv(process.env);

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
            "Patient folder under patients/ or path to a patient text or JSON file",
        }),
    )
    .check((args) => {
      if (args.patient === undefined) {
        throw new Error("Patient is required. Usage: pnpm run cli <patient>");
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
  const patientSource = await resolvePatientPath(patientArg);
  const rawPatient = await readFile(patientSource.path, "utf8");

  if (patientSource.kind === "text") {
    if (patientSource.shouldPersistFixture) {
      const fixturePath = await persistTextPatientFixture(
        patientArg,
        rawPatient,
      );
      console.info(`Created reusable text patient fixture: ${fixturePath}`);
    }

    return rawPatient;
  }

  return JSON.parse(rawPatient);
}

async function resolvePatientPath(patientArg: string) {
  const directPath = path.resolve(patientArg);

  if (await fileExists(directPath)) {
    const kind = patientFileKind(directPath);
    return {
      kind,
      path: directPath,
      shouldPersistFixture:
        kind === "text" && !isExistingTextPatientFixture(directPath),
    } as const;
  }

  const textPatientPath = path.resolve("patients", patientArg, "patient.txt");

  if (await fileExists(textPatientPath)) {
    return {
      kind: "text",
      path: textPatientPath,
      shouldPersistFixture: false,
    } as const;
  }

  const jsonPatientPath = path.resolve("patients", patientArg, "patient.json");

  if (await fileExists(jsonPatientPath)) {
    return {
      kind: "json",
      path: jsonPatientPath,
      shouldPersistFixture: false,
    } as const;
  }

  const patients = await listAvailablePatients();
  throw new Error(
    `Unknown patient "${patientArg}". Available patients: ${patients.join(", ")}`,
  );
}

function patientFileKind(filePath: string): "text" | "json" {
  return path.extname(filePath).toLowerCase() === ".txt" ? "text" : "json";
}

function isExistingTextPatientFixture(filePath: string) {
  const relativePath = path.relative(process.cwd(), filePath);
  const parts = relativePath.split(path.sep);

  return (
    parts.length === 3 && parts[0] === "patients" && parts[2] === "patient.txt"
  );
}

async function persistTextPatientFixture(patientArg: string, text: string) {
  const fixtureName = textFixtureName(patientArg);
  const fixtureDirectory = path.resolve("patients", fixtureName);
  const fixturePath = path.join(fixtureDirectory, "patient.txt");

  await mkdir(fixtureDirectory, { recursive: true });
  await writeFile(fixturePath, text);

  return path.relative(process.cwd(), fixturePath);
}

function textFixtureName(patientArg: string) {
  const parsed = path.parse(patientArg);
  const baseName = parsed.name || parsed.base || "text_patient";
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug.length > 0 ? slug : "text_patient";
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
