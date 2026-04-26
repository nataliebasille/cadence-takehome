import { type openai, createOpenAI } from "@ai-sdk/openai";

type CreateOpenAIModelOptions = {
  apiKey: string;
  model: Parameters<typeof openai>[0];
};

export function createOpenAIModel(options: CreateOpenAIModelOptions) {
  return createOpenAI(options)(options.model);
}
