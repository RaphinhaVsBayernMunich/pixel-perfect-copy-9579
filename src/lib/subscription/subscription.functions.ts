import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectiveTier } from "./entitlement";
import { z } from "zod";

export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select(
        "subscription_status, entitlement, current_plan, trial_start, trial_end, premium_expiration, revenuecat_customer_id, last_verification",
      )
      .eq("user_id", context.userId)
      .single()
      .throwOnError();
    if (!data) throw new Error("Profile not found");
    // Compute access at request time without a stale read overwriting a concurrent purchase.
    if (effectiveTier(data) === "free") {
      return {
        ...data,
        entitlement: "free",
        subscription_status: data.entitlement === "premium" ? "expired" : data.subscription_status,
      };
    }
    return data;
  });

export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fingerprint: z.string().min(6).max(256),
        platform: z.string().max(32),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const pepper = process.env.INSTALL_FINGERPRINT_PEPPER;
    if (!pepper || pepper.length < 32)
      throw new Error("INSTALL_FINGERPRINT_PEPPER must contain at least 32 characters");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${data.fingerprint}::${pepper}`),
    );
    const fingerprint = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result } = await supabaseAdmin
      .rpc("register_signup_trial", {
        _user_id: context.userId,
        _fingerprint: fingerprint,
        _platform: data.platform,
      })
      .throwOnError();
    return z
      .object({
        granted: z.boolean(),
        reason: z.string(),
        status: z.string(),
        trialEnd: z.string().optional(),
      })
      .parse(result);
  });

export const listSubscriptionEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscription_events")
      .select("id, kind, source, product_id, entitlement, metadata, occurred_at")
      .eq("user_id", context.userId)
      .order("occurred_at", { ascending: false })
      .limit(50)
      .throwOnError();
    return data;
  });
