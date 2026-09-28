import "@tanstack/react-start/server-only";
import { z } from "zod";
import { APP_CONFIG } from "@/lib/config/admin-config";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AiError, type AiFeature, type AiErrorCode } from "../ai-contracts";
import type { TokenUsage } from "../ai-gateway.server";
const reservationSchema = z.discriminatedUnion("allowed", [
  z.object({
    allowed: z.literal(true),
    requestId: z.string().uuid(),
    used: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
  z.object({
    allowed: z.literal(false),
    reason: z.enum(["quota", "busy"]),
    used: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
  }),
]);
export async function checkAndConsumeAiQuota(userId: string, feature: AiFeature): Promise<string> {
  const limits = APP_CONFIG.aiQuota;
  const premiumLimit = Math.min(limits.premium ?? Infinity, limits.premiumHardCeiling);
  if (!Number.isSafeInteger(premiumLimit) || premiumLimit < 1) throw new AiError("AI_UNAVAILABLE");
  const { data, error } = await supabaseAdmin
    .rpc("reserve_ai_request", {
      _user_id: userId,
      _feature: feature,
      _free_limit: limits.free,
      _trial_limit: limits.trial,
      _premium_limit: premiumLimit,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new AiError("AI_UNAVAILABLE");
  const parsed = reservationSchema.safeParse(data);
  if (!parsed.success) throw new AiError("AI_UNAVAILABLE");
  if (!parsed.data.allowed)
    throw new AiError(parsed.data.reason === "quota" ? "AI_QUOTA" : "AI_BUSY");
  if (parsed.data.used > parsed.data.limit) throw new AiError("AI_UNAVAILABLE");
  return parsed.data.requestId;
}
export async function finishAiRequest(
  requestId: string,
  errorCode: AiErrorCode | null,
  usage?: TokenUsage,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    // SQL args are nullable; generated types mark plpgsql args non-null.
    .rpc("finish_ai_request", {
      _request_id: requestId,
      _error_code: errorCode as string,
      _input_tokens: (usage?.inputTokens ?? null) as number,
      _output_tokens: (usage?.outputTokens ?? null) as number,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error || data !== true) throw new AiError("AI_UNAVAILABLE");
}
