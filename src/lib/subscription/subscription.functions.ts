/**
 * Server functions for the subscription system.
 *
 * All privileged reads/writes go through here — the backend, not the
 * client, is authoritative. RevenueCat webhooks (see
 * `src/routes/api/public/revenuecat-webhook.ts`) write purchase state; this
 * module reads it and manages the app-managed 7-day trial.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TRIAL_DAYS = 7;

// ------------------------------------------------------------
// getSubscription — canonical entitlement read
// ------------------------------------------------------------
export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "subscription_status, entitlement, current_plan, trial_start, trial_end, premium_expiration, revenuecat_customer_id, last_verification",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    // Server-side transition: trial → expired if the end date passed.
    if (
      data &&
      data.subscription_status === "trial" &&
      data.trial_end &&
      new Date(data.trial_end).getTime() < Date.now()
    ) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({
          subscription_status: "expired",
          entitlement: "free",
          current_plan: "trial",
          last_verification: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select(
          "subscription_status, entitlement, current_plan, trial_start, trial_end, premium_expiration, revenuecat_customer_id, last_verification",
        )
        .maybeSingle();
      await logEvent(supabase, userId, "trial_expired", {});
      return updated ?? data;
    }
    return data;
  });

// ------------------------------------------------------------
// startTrial — grant a 7-day premium trial, gated by installation fingerprint
// ------------------------------------------------------------
const startTrialInput = z.object({
  fingerprint: z.string().min(6).max(256),
  platform: z.string().max(32),
});

export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startTrialInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Hash the fingerprint server-side with a stable pepper so the DB
    //    never holds a value that can be correlated by anyone else.
    const pepper = process.env.INSTALL_FINGERPRINT_PEPPER ?? "questos-default-pepper-change-me";
    const hashed = await sha256(`${data.fingerprint}::${pepper}`);

    // 2. Read the installation row (if any).
    const { data: install } = await supabase
      .from("installations")
      .select("id, trial_consumed, user_ids")
      .eq("fingerprint", hashed)
      .maybeSingle();

    // 3. Read the profile to see if the user is already on a trial or paid.
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, trial_start, trial_end, entitlement")
      .eq("user_id", userId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const endIso = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // 4. Abuse-prevention: if this install already consumed a trial via a
    //    *different* user, block. Same user reinstalling → allow the
    //    remaining time from their existing trial record (never restart).
    if (install?.trial_consumed) {
      const otherUsers = (install.user_ids ?? []).filter((u: string) => u !== userId);
      if (otherUsers.length > 0 && !(install.user_ids ?? []).includes(userId)) {
        return {
          granted: false,
          reason: "installation_already_consumed_trial",
          status: profile?.subscription_status ?? "free",
        };
      }
    }

    // 5. Existing paid users: no-op.
    if (profile?.entitlement === "premium" && profile.subscription_status === "premium") {
      return { granted: false, reason: "already_premium", status: "premium" };
    }

    // 6. Grant / reuse trial. If the profile already has a trial_end in
    //    the future, keep it (idempotent). Otherwise start a fresh 7 days.
    let trialStart = profile?.trial_start ?? nowIso;
    let trialEnd = profile?.trial_end ?? endIso;
    if (!profile?.trial_end || new Date(profile.trial_end).getTime() < Date.now()) {
      trialStart = nowIso;
      trialEnd = endIso;
    }

    await supabase
      .from("profiles")
      .update({
        subscription_status: "trial",
        entitlement: "premium",
        current_plan: "trial",
        trial_start: trialStart,
        trial_end: trialEnd,
        last_verification: nowIso,
      })
      .eq("user_id", userId);

    // 7. Upsert the installation and mark trial consumed.
    if (install) {
      const userIds = Array.from(new Set([...(install.user_ids ?? []), userId]));
      await supabase
        .from("installations")
        .update({
          trial_consumed: true,
          trial_consumed_by: install.trial_consumed ? undefined : userId,
          trial_consumed_at: install.trial_consumed ? undefined : nowIso,
          last_seen_at: nowIso,
          user_ids: userIds,
        })
        .eq("id", install.id);
    } else {
      // Service role write via admin client — needed because RLS on
      // installations restricts inserts.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("installations").insert({
        fingerprint: hashed,
        platform: data.platform,
        trial_consumed: true,
        trial_consumed_by: userId,
        trial_consumed_at: nowIso,
        user_ids: [userId],
      });
    }

    await logEvent(supabase, userId, "trial_started", { platform: data.platform });

    return { granted: true, reason: "granted", status: "trial", trialEnd };
  });

// ------------------------------------------------------------
// listSubscriptionEvents — history for the settings screen
// ------------------------------------------------------------
export const listSubscriptionEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("subscription_events")
      .select("id, kind, source, product_id, entitlement, metadata, occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------
async function sha256(value: string): Promise<string> {
  const buf = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function logEvent(
  supabase: any,
  userId: string,
  kind: string,
  metadata: Record<string, unknown>,
) {
  try {
    await supabase.from("subscription_events").insert({
      user_id: userId,
      kind,
      source: "server",
      metadata,
    });
  } catch {
    /* audit log is best-effort */
  }
}
