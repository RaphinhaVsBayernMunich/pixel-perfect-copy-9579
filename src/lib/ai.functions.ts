import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { checkAndConsumeAiQuota } from "@/lib/subscription/ai-quota.functions";

const MODEL = "google/gemini-2.5-flash";

class QuotaExceededError extends Error {
  constructor(public used: number, public limit: number) {
    super(`AI daily quota exceeded (${used}/${limit}).`);
    this.name = "QuotaExceededError";
  }
}

async function enforceAiQuota(context: any, feature: string) {
  const result = await checkAndConsumeAiQuota(context.supabase, context.userId, feature);
  if (!result.allowed) throw new QuotaExceededError(result.used, result.limit);
  return result;
}

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  // Import server-only helper inside handler to keep it out of client bundle.
  return import("@/lib/ai-gateway.server").then((m) =>
    m.createLovableAiGatewayProvider(key),
  );
}

// ============================================================
// 1. Morning Brief
// ============================================================
const morningBriefInput = z.object({
  characterName: z.string(),
  level: z.number(),
  streakDays: z.number(),
  momentum: z.number(),
  todayQuests: z.array(
    z.object({
      title: z.string(),
      type: z.string(),
      category: z.string(),
      xp: z.number(),
      completed: z.boolean().optional(),
      startTime: z.string().optional(),
    }),
  ),
});

export const morningBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => morningBriefInput.parse(input))
  .handler(async ({ data, context }) => {
    await enforceAiQuota(context, "morning_brief");
    const gateway = await getGateway();
    const pending = data.todayQuests.filter((q) => !q.completed);
    const done = data.todayQuests.length - pending.length;

    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `You are a warm but sharp life-coach speaking to ${data.characterName}, Level ${data.level}, on a ${data.streakDays}-day streak.
Momentum: ${Math.round(data.momentum * 100)}%.
Today's schedule (${done} done, ${pending.length} left):
${pending.map((q) => `- ${q.startTime ?? "any"} ${q.title} (${q.type}, ${q.category}, +${q.xp} XP)`).join("\n") || "- (nothing scheduled)"}

Write a punchy 2-3 sentence morning brief. Reference one specific quest. End with a single-line rallying cry. No emoji, no lists, no markdown.`,
    });
    return { brief: text.trim() };
  });

// ============================================================
// 2. Goal → Quests
// ============================================================
const goalInput = z.object({
  goal: z.string().min(3),
  horizon: z.enum(["week", "month", "quarter", "year"]),
});

const questSchema = z.object({
  title: z.string(),
  description: z.string(),
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
  estimatedMinutes: z.number(),
});

export const goalToQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => goalInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = await getGateway();
    try {
      const { output } = await generateText({
        model: gateway(MODEL),
        output: Output.object({
          schema: z.object({ quests: z.array(questSchema) }),
        }),
        prompt: `Break down this ${data.horizon}-long goal into 4 to 7 concrete quests for a gamified life-OS.

Goal: "${data.goal}"

Rules:
- Mix types: at least one "main" (project-sized), one or two "weekly" (recurring), one "daily" habit.
- Titles are short imperative phrases (max 6 words).
- Descriptions are ONE sentence explaining the concrete action.
- Estimate realistic minutes.
- Pick category, priority, difficulty that match the effort.

Return a "quests" array.`,
      });
      return { quests: output.quests };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return { quests: [] as z.infer<typeof questSchema>[] };
      }
      throw error;
    }
  });

// ============================================================
// 3. Reflection prompt
// ============================================================
const reflectionInput = z.object({
  recentCompletions: z.array(z.string()),
  streakDays: z.number(),
  totalXp: z.number(),
});

export const reflectionPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reflectionInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = await getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `Write ONE thoughtful journal prompt (single question, under 20 words) for a player who just finished these quests:
${data.recentCompletions.slice(0, 8).map((t) => `- ${t}`).join("\n") || "- (no recent activity)"}
Streak: ${data.streakDays} days. Total XP: ${data.totalXp}.

The prompt should invite reflection on patterns, meaning, or what to change. Return only the question, no preamble.`,
    });
    return { prompt: text.trim() };
  });

// ============================================================
// 4. Starter quests from onboarding profile
// ============================================================
const starterInput = z.object({
  preferredName: z.string().optional(),
  profession: z.string().optional(),
  yearGoal: z.string().optional(),
  fiveYearGoal: z.string().optional(),
  dreamLife: z.string().optional(),
  interests: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  chronotype: z.string().optional(),
});

export const generateStarterQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => starterInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = await getGateway();
    try {
      const { output } = await generateText({
        model: gateway(MODEL),
        output: Output.object({
          schema: z.object({
            mainQuest: questSchema,
            starters: z.array(questSchema),
            welcome: z.string(),
          }),
        }),
        prompt: `You are the AI Coach for QuestOS. A new player just finished onboarding. Design their opening game state.

Player:
- Name: ${data.preferredName || "Player"}
- Profession: ${data.profession || "unspecified"}
- ${data.chronotype ?? "flexible"} chronotype
- Interests: ${(data.interests ?? []).join(", ") || "unspecified"}
- Skills they want to level up: ${(data.skills ?? []).join(", ") || "unspecified"}
- Goal this year: ${data.yearGoal || "unspecified"}
- 5-year goal: ${data.fiveYearGoal || "unspecified"}
- Dream life: ${data.dreamLife || "unspecified"}

Return:
1. mainQuest — one "main" type quest that anchors their year-goal.
2. starters — 5 to 7 quests mixing daily habits, weekly rituals, and side quests that build the skills and interests above.
3. welcome — a single-sentence AI Coach welcome addressed to the player (no emoji, no markdown).

Titles: short imperative phrases (max 6 words). Descriptions: one sentence, concrete action. Realistic minutes. Pick categories that match interests/skills.`,
      });
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return {
          mainQuest: null as any,
          starters: [] as z.infer<typeof questSchema>[],
          welcome: "Your journey begins. Set your first quest.",
        };
      }
      throw error;
    }
  });
