import { createServerFn } from "@tanstack/react-start";
import { unwrapAi, type AiInput } from "./ai-contracts";

// Validation is inside the server error boundary to avoid sending Zod errors/stacks.
const morningBriefServer = createServerFn({ method: "POST" })
  .validator((input: AiInput<"morning_brief">) => input)
  .handler(async ({ data }) => {
    const { runAi } = await import("./ai-service.server");
    return runAi("morning_brief", data);
  });
const goalToQuestsServer = createServerFn({ method: "POST" })
  .validator((input: AiInput<"goal_to_quests">) => input)
  .handler(async ({ data }) => {
    const { runAi } = await import("./ai-service.server");
    return runAi("goal_to_quests", data);
  });
const reflectionPromptServer = createServerFn({ method: "POST" })
  .validator((input: AiInput<"reflection_prompt">) => input)
  .handler(async ({ data }) => {
    const { runAi } = await import("./ai-service.server");
    return runAi("reflection_prompt", data);
  });
const starterQuestsServer = createServerFn({ method: "POST" })
  .validator((input: AiInput<"starter_quests">) => input)
  .handler(async ({ data }) => {
    const { runAi } = await import("./ai-service.server");
    return runAi("starter_quests", data);
  });
// Preserve the existing useServerFn API and successful return shapes.
export const morningBrief = (options: Parameters<typeof morningBriefServer>[0]) =>
  unwrapAi(() => morningBriefServer(options));
export const goalToQuests = (options: Parameters<typeof goalToQuestsServer>[0]) =>
  unwrapAi(() => goalToQuestsServer(options));
export const reflectionPrompt = (options: Parameters<typeof reflectionPromptServer>[0]) =>
  unwrapAi(() => reflectionPromptServer(options));
export const generateStarterQuests = (options: Parameters<typeof starterQuestsServer>[0]) =>
  unwrapAi(() => starterQuestsServer(options));
