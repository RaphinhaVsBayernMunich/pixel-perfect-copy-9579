import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  aiInputs,
  aiOutputs,
  AiError,
  aiFailure,
  type AiFeature,
  type AiOutput,
  type AiResult,
} from "./ai-contracts";
import {
  generateDeepSeek,
  requireDeepSeekKey,
  ProviderError,
  type TokenUsage,
} from "./ai-gateway.server";
import { checkAndConsumeAiQuota, finishAiRequest } from "./subscription/ai-quota.functions";

const questInstructions = `Every quest is a JSON object with exactly: title (short imperative, at most 6 words), description (one sentence), type (main|daily|weekly|side|boss), category (fitness|business|academics|coding|football|creativity|finance|health|relationships|lifestyle), priority (critical|high|medium|low|someday), difficulty (very-easy|easy|medium|hard|extreme), estimatedMinutes (integer 1 to 10080). Use realistic durations.`;
const evidenceInstruction =
  'Use only the supplied computed evidence. Reference specific numeric scenarios, quest titles or category counts. Do not invent personal facts or promise outcomes. Return JSON {"summary":"...","observations":["...","..."],"nextSteps":["...","..."]}. Clearly distinguish projections from guarantees.';
export const featureSettings = {
  future_me: {
    maxTokens: 2048,
    instruction:
      "Act as the player reflecting from their chosen future year. Explain how the supplied adherence scenarios change practice hours, with milestones for the stated goal. " +
      evidenceInstruction,
  },
  goal_simulator: {
    maxTokens: 2048,
    instruction:
      "Compare the supplied goal scenarios: time to completion, weekly burden, and opportunity cost against the existing backlog. " +
      evidenceInstruction,
  },
  executive_assistant: {
    maxTokens: 2048,
    instruction:
      "Explain the proposed schedule using exact quest names and time slots. Identify tradeoffs and preparation actions. The plan is a proposal: never claim that changes are already applied. " +
      evidenceInstruction,
  },
  morning_brief: {
    maxTokens: 512,
    instruction:
      'You are a warm, sharp life coach. Write a punchy 2-3 sentence morning brief using the supplied character name, level, streak and momentum (0 to 1). Reference one pending quest if available. End with a rallying cry. No emoji, lists or markdown. Return JSON {"brief":"your brief"}.',
  },
  goal_to_quests: {
    maxTokens: 3072,
    instruction: `Break down the supplied goal over its horizon into 4 to 7 concrete quests for a gamified life OS. Include at least one main project, one or two weekly quests and one daily habit. ${questInstructions} Return JSON {"quests":[quest objects]}.`,
  },
  reflection_prompt: {
    maxTokens: 256,
    instruction:
      'Write ONE thoughtful journal question under 20 words about patterns, meaning or what to change, based on recent completions, streak and XP. No preamble. Return JSON {"prompt":"your question?"}.',
  },
  starter_quests: {
    maxTokens: 4096,
    instruction: `Design an opening game state for a new QuestOS player using their onboarding details. Include one mainQuest with type main anchoring their year goal, 5 to 7 starters mixing daily habits, weekly rituals and side quests for their interests and skills, and a single-sentence welcome addressed to the player (no emoji or markdown). ${questInstructions} Return JSON {"mainQuest":quest object,"starters":[quest objects],"welcome":"welcome sentence"}.`,
  },
} as const;

async function authenticate(token: string): Promise<string> {
  // Bound auth latency as well; an expired/revoked token never reaches quota or the model.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { data, error } = await Promise.race([
      supabaseAdmin.auth.getUser(token),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AiError("AI_UNAVAILABLE")), 10_000);
      }),
    ]);
    if (error || !data.user) throw new AiError("AI_AUTH_REQUIRED");
    return data.user.id;
  } finally {
    clearTimeout(timer);
  }
}

const productionDependencies = {
  getRequest,
  authenticate,
  getKey: requireDeepSeekKey,
  reserve: checkAndConsumeAiQuota,
  generate: generateDeepSeek,
  finish: finishAiRequest,
  memory: async (userId: string) => {
    const { coachMemory } = await import("./premium/data.server");
    return coachMemory(userId);
  },
};

// Auth happens inside the safe response boundary, so infrastructure errors and stacks
// from authentication, validation, SQL and providers never become wire responses.
export async function runAi<F extends AiFeature>(
  feature: F,
  input: unknown,
  dependencies: Omit<typeof productionDependencies, "memory"> &
    Partial<Pick<typeof productionDependencies, "memory">> = productionDependencies,
): Promise<AiResult<AiOutput<F>>> {
  let requestId: string | undefined;
  let usage: TokenUsage | undefined;
  try {
    const request = dependencies.getRequest();
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ") || authorization.length > 8192)
      throw new AiError("AI_AUTH_REQUIRED");
    if (Number(request.headers.get("content-length")) > 128_000)
      throw new AiError("AI_INVALID_INPUT");
    const parsed = aiInputs[feature].safeParse(input);
    if (!parsed.success || new TextEncoder().encode(JSON.stringify(parsed.data)).length > 32_000)
      throw new AiError("AI_INVALID_INPUT");
    const key = dependencies.getKey();
    // getUser verifies this token with Supabase Auth; no client identity or entitlement is accepted.
    const userId = await dependencies.authenticate(authorization.slice(7));
    requestId = await dependencies.reserve(userId, feature);
    const memory = dependencies.memory ? await dependencies.memory(userId) : undefined;
    const providerInput = memory ? { request: parsed.data, memory } : parsed.data;
    if (new TextEncoder().encode(JSON.stringify(providerInput)).length > 48000)
      throw new AiError("AI_INVALID_INPUT");
    const generated = await dependencies.generate(key, {
      ...featureSettings[feature],
      instruction:
        featureSettings[feature].instruction +
        " Respect the supplied tone preference (warm, sharp or playful) while remaining factual and supportive.",
      input: providerInput,
    });
    usage = generated.usage;
    let json: unknown;
    try {
      json = JSON.parse(generated.content);
    } catch {
      throw new AiError("AI_INVALID_RESPONSE");
    }
    const validated = aiOutputs[feature].safeParse(json);
    if (!validated.success) throw new AiError("AI_INVALID_RESPONSE");
    await dependencies.finish(requestId, null, usage);
    return { ok: true, value: validated.data as AiOutput<F> };
  } catch (error) {
    const failure = aiFailure(error);
    if (requestId) {
      try {
        await dependencies.finish(
          requestId,
          failure.code,
          error instanceof ProviderError ? error.usage : usage,
        );
      } catch {
        /* Reservation stays charged; its concurrency lease expires automatically. */
      }
    }
    return failure;
  }
}
