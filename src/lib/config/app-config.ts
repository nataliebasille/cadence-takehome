import z from "zod";

const appConfigSchema = z.object({
  openAIApiKey: z.string(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig = {
  fromEnv(processEnv: NodeJS.ProcessEnv) {
    return appConfigSchema.parseAsync({
      openAIApiKey: processEnv.OPENAI_API_KEY,
    });
  },
};
