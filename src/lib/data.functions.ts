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
    const { data: core, error: coreError } = await supabase.rpc("read_account_save" as never);
    if (coreError || !core) throw new Error("Export failed. Please retry; no data was removed.");
    const { billingDb } = await import("./subscription/billing-db.server");
    const { data: premium, error: premiumError } = await billingDb
      .from("premium_documents")
      .select("kind,value,updated_at")
      .eq("user_id", userId);
    if (premiumError) throw new Error("Premium data export failed. Please retry.");
    return {
      premium_documents_json: JSON.stringify(premium ?? []),
      exported_at: new Date().toISOString(),
      user_id: userId,
      // Snapshot includes only editable profile fields and owned core records.
      core_json: JSON.stringify(core),
    };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(input))
  .handler(async ({ context }) => {
    const { userId } = context;
    // ON DELETE CASCADE on auth.users FK removes rows in public tables that
    // reference user_id. Deleting the auth user is authoritative.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // All user-owned tables use ON DELETE CASCADE. Do not partially erase data before auth deletion succeeds.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });

export const clearHealthSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ confirm: z.literal("CLEAR_HEALTH") })
      .strict()
      .parse(input),
  )
  .handler(async ({ context }) => {
    const { billingDb } = await import("./subscription/billing-db.server");
    const { error } = await billingDb
      .from("premium_documents")
      .delete()
      .eq("user_id", context.userId)
      .eq("kind", "health");
    if (error) throw new Error("Health summary could not be cleared.");
    return { ok: true };
  });
