import { z } from "zod";
const short = z.string().trim().max(240);
const count = z.number().int().min(0).max(1_000_000_000);
const premiumEvidence = z.object({ evidence: z.string().min(2).max(16000) }).strict();
export const aiInputs = {
  future_me: premiumEvidence,
  goal_simulator: premiumEvidence,
  executive_assistant: premiumEvidence,
  morning_brief: z
    .object({
      characterName: short,
      level: count,
      streakDays: count,
      momentum: z.number().min(0).max(1),
      todayQuests: z
        .array(
          z
            .object({
              title: short,
              type: short,
              category: short,
              xp: count,
              completed: z.boolean().optional(),
              startTime: z.string().max(32).optional(),
            })
            .strict(),
        )
        .max(100),
    })
    .strict(),
  goal_to_quests: z
    .object({
      goal: z.string().trim().min(3).max(8000),
      horizon: z.enum(["week", "month", "quarter", "year"]),
    })
    .strict(),
  reflection_prompt: z
    .object({ recentCompletions: z.array(short).max(100), streakDays: count, totalXp: count })
    .strict(),
  starter_quests: z
    .object({
      preferredName: short.optional(),
      profession: short.optional(),
      yearGoal: z.string().max(4000).optional(),
      fiveYearGoal: z.string().max(4000).optional(),
      dreamLife: z.string().max(4000).optional(),
      chronotype: short.optional(),
      interests: z.array(short).max(30).optional(),
      skills: z.array(short).max(30).optional(),
    })
    .strict(),
};
export const questSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1000),
    type: z.enum(["main", "daily", "weekly", "side", "boss"]),
    category: z.enum([
      "fitness",
      "business",
      "academics",
      "coding",
      "football",
      "creativity",
      "finance",
      "health",
      "relationships",
      "lifestyle",
    ]),
    priority: z.enum(["critical", "high", "medium", "low", "someday"]),
    difficulty: z.enum(["very-easy", "easy", "medium", "hard", "extreme"]),
    estimatedMinutes: z.number().int().min(1).max(10080),
  })
  .strict();
const premiumNarrative = z
  .object({
    summary: z.string().min(10).max(2000),
    observations: z.array(z.string().min(5).max(500)).min(2).max(5),
    nextSteps: z.array(z.string().min(5).max(500)).min(2).max(5),
  })
  .strict();
export const aiOutputs = {
  future_me: premiumNarrative,
  goal_simulator: premiumNarrative,
  executive_assistant: premiumNarrative,
  morning_brief: z.object({ brief: z.string().trim().min(1).max(2400) }).strict(),
  goal_to_quests: z.object({ quests: z.array(questSchema).min(4).max(7) }).strict(),
  reflection_prompt: z.object({ prompt: z.string().trim().min(1).max(500) }).strict(),
  starter_quests: z
    .object({
      mainQuest: questSchema.extend({ type: z.literal("main") }),
      starters: z.array(questSchema).min(5).max(7),
      welcome: z.string().trim().min(1).max(600),
    })
    .strict(),
};
export type AiFeature = keyof typeof aiInputs;
export type AiInput<F extends AiFeature> = z.infer<(typeof aiInputs)[F]>;
export type AiOutput<F extends AiFeature> = z.infer<(typeof aiOutputs)[F]>;
export const aiMessages = {
  AI_AUTH_REQUIRED: "Please sign in again to use AI Coach.",
  AI_INVALID_INPUT:
    "This request is too large or contains invalid values. Please shorten it and try again.",
  AI_UNAVAILABLE: "AI Coach is temporarily unavailable. Please try again later.",
  AI_QUOTA: "You have reached your daily AI limit. Please try again tomorrow.",
  AI_BUSY: "AI Coach is busy. Please wait a moment and try again.",
  AI_PROVIDER_AUTH: "AI Coach is temporarily unavailable. Please try again later.",
  AI_BALANCE: "AI Coach is temporarily unavailable. Please try again later.",
  AI_PROVIDER_REQUEST: "AI Coach could not process this request. Please try a shorter request.",
  AI_TIMEOUT: "AI Coach took too long to respond. Please try again.",
  AI_NETWORK: "AI Coach could not connect. Please try again later.",
  AI_INVALID_RESPONSE: "AI Coach returned an incomplete response. Please try again.",
} as const;
export type AiErrorCode = keyof typeof aiMessages;
export class AiError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(aiMessages[code]);
  }
}
export type AiResult<T> = { ok: true; value: T } | { ok: false; code: AiErrorCode };
export function aiFailure(error: unknown): { ok: false; code: AiErrorCode } {
  return { ok: false, code: error instanceof AiError ? error.code : "AI_UNAVAILABLE" };
}
// Only safe envelopes cross the wire; exceptions originate in the caller.
export async function unwrapAi<T>(call: () => Promise<AiResult<T>>): Promise<T> {
  let result: AiResult<T>;
  try {
    result = await call();
  } catch {
    throw new AiError("AI_NETWORK");
  }
  if (!result.ok) throw new AiError(result.code);
  return result.value;
}
