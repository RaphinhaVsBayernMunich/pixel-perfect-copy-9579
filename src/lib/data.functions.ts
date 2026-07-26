/**
 * Data export + account deletion server functions.
 *
 * - `exportUserData` returns the complete user snapshot (profile, quests,
 *   legacy events, achievements, subscription events, settings). Used by
 *   Settings → Data Export.
 * - `deleteAccount` cascades removal of user rows and marks the auth user
 *   for deletion via the admin API. NEVER call this without a fresh
 *   confirmation flow client-side.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const exportUserData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, quests, events, achievements, subEvents, aiUsage] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("quests").select("*").eq("user_id", userId),
      supabase.from("legacy_events").select("*").eq("user_id", userId),
      supabase.from("user_achievements").select("*").eq("user_id", userId),
      supabase.from("subscription_events").select("*").eq("user_id", userId),
      supabase.from("ai_usage").select("*").eq("user_id", userId),
    ]);
    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data ?? null,
      quests: quests.data ?? [],
      legacy_events: events.data ?? [],
      achievements: achievements.data ?? [],
      subscription_events: subEvents.data ?? [],
      ai_usage: aiUsage.data ?? [],
    };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ confirm: z.literal("DELETE") }).parse(input),
  )
  .handler(async ({ context }) => {
    const { userId } = context;
    // ON DELETE CASCADE on auth.users FK removes rows in public tables that
    // reference user_id. Deleting the auth user is authoritative.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Best-effort cleanup for anything not cascaded.
    await Promise.all([
      supabaseAdmin.from("quests").delete().eq("user_id", userId),
      supabaseAdmin.from("legacy_events").delete().eq("user_id", userId),
      supabaseAdmin.from("user_achievements").delete().eq("user_id", userId),
      supabaseAdmin.from("subscription_events").delete().eq("user_id", userId),
      supabaseAdmin.from("analytics_events").delete().eq("user_id", userId),
      supabaseAdmin.from("ai_usage").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("user_id", userId),
    ]);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });
