/**
 * Server functions for user settings persistence and account lifecycle.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const settingsShape = z.record(z.unknown()); // Loose — validated client-side.

export const loadSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.settings as Record<string, unknown> | null) ?? null;
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ settings: settingsShape }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ settings: data.settings as any })
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
