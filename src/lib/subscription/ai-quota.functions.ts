/**
 * AI quota enforcement — the single choke-point for every AI server fn.
 *
 * Any new AI feature must call `checkAndConsumeAiQuota(feature)` from
 * inside its handler BEFORE hitting the model. Quotas come from
 * `APP_CONFIG.aiQuota` so pricing / limits are one-line edits.
 */
import { APP_CONFIG } from "@/lib/config/admin-config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveTier } from "./entitlement";

export type AiQuotaResult =
  | { allowed: true; remaining: number | null; used: number; limit: number | null }
  | { allowed: false; reason: "quota_exceeded" | "hard_ceiling"; used: number; limit: number };

/**
 * Consume 1 AI request for `userId` if quota permits. Reads the user's
 * subscription entitlement from `profiles`, then atomically increments
 * `ai_usage` for today via the SECURITY DEFINER helper.
 */
export async function checkAndConsumeAiQuota(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
): Promise<AiQuotaResult> {
  // 1. Determine tier + limit.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, entitlement, trial_end, premium_expiration")
    .eq("user_id", userId)
    .single()
    .throwOnError();

  const tier = effectiveTier(profile);
  const isPremium = tier === "premium";
  const isTrial = tier === "trial";
  const limit: number | null = isPremium
    ? APP_CONFIG.aiQuota.premium
    : isTrial
      ? APP_CONFIG.aiQuota.trial
      : APP_CONFIG.aiQuota.free;
  const hardCeiling =
    isPremium && APP_CONFIG.aiQuota.premiumHardCeiling > 0
      ? APP_CONFIG.aiQuota.premiumHardCeiling
      : null;

  // 2. Peek current usage without incrementing so we can block cleanly.
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("request_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle()
    .throwOnError();
  const used = usage?.request_count ?? 0;

  if (limit !== null && used >= limit) {
    return { allowed: false, reason: "quota_exceeded", used, limit };
  }
  if (hardCeiling && used >= hardCeiling) {
    return { allowed: false, reason: "hard_ceiling", used, limit: hardCeiling };
  }

  // 3. Increment. Use the service role via the SECURITY DEFINER RPC so
  //    RLS on ai_usage stays SELECT-only for the user.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: newCount } = await supabaseAdmin
    .rpc("increment_ai_usage", {
      _user_id: userId,
      _feature: feature,
    })
    .throwOnError();
  if (typeof newCount !== "number") throw new Error("AI usage reservation failed");
  const nowUsed = newCount;
  // Concurrent requests may all pass the peek. Only the first limit reservations proceed.
  if (limit !== null && nowUsed > limit)
    return { allowed: false, reason: "quota_exceeded", used: nowUsed, limit };
  if (hardCeiling && nowUsed > hardCeiling)
    return { allowed: false, reason: "hard_ceiling", used: nowUsed, limit: hardCeiling };
  const remaining = limit === null ? null : Math.max(0, limit - nowUsed);
  return { allowed: true, remaining, used: nowUsed, limit };
}
