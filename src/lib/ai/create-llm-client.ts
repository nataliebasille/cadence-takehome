import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  type LanguageModel,
  type Output,
  type ToolSet,
} from "ai";

export type AiClient = ReturnType<typeof createLlmClient>;

type GenerateTextOptions<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output.Output = Output.Output<string, string>,
> = Omit<Parameters<typeof aiGenerateText<TOOLS, OUTPUT>>[0], "model">;

type StreamTextOptions<
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output.Output = Output.Output<string, string>,
> = Omit<Parameters<typeof aiStreamText<TOOLS, OUTPUT>>[0], "model">;

export function createLlmClient(model: LanguageModel) {
  async function generate<
    TOOLS extends ToolSet,
    OUTPUT extends Output.Output = Output.Output<string, string>,
  >(request: GenerateTextOptions<TOOLS, OUTPUT>) {
    const params = {
      ...request,
      model,
    } as Parameters<typeof aiGenerateText<TOOLS, OUTPUT>>[0];

    return aiGenerateText<TOOLS, OUTPUT>(params);
  }

  async function stream<
    TOOLS extends ToolSet,
    OUTPUT extends Output.Output = Output.Output<string, string>,
  >(request: StreamTextOptions<TOOLS, OUTPUT>) {
    const params = {
      ...request,
      model,
    } as Parameters<typeof aiStreamText<TOOLS, OUTPUT>>[0];

    return aiStreamText<TOOLS, OUTPUT>(params);
  }

  return {
    generate,
    stream,
  };
}
