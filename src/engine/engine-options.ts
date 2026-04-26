import type { AiClient } from "../lib/ai/create-llm-client.ts";
import type { Logger } from "../lib/logger.ts";

export type PreOpSchedulingTriagerOptions = {
  aiClient: AiClient;
  logger: Logger;
  now: () => Date;
};
