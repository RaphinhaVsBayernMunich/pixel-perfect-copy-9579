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
    // Request processor deletion first. On failure keep the account available for retry.
    const { deleteRevenueCatCustomer } = await import("./subscription/revenuecat-http.server");
    const key = process.env.REVENUECAT_SECRET_API_KEY;
    if (!key) throw new Error("Account deletion is temporarily unavailable. Contact support.");
    await deleteRevenueCatCustomer(userId, key);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // User-owned rows cascade. Trial anti-abuse hashes and billing deduplication IDs remain.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error)
      throw new Error(
        "Billing deletion was requested, but account removal failed. Retry deletion or contact support.",
      );
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
