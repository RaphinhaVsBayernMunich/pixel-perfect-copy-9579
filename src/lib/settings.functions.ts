/**
 * Server functions for user settings persistence and account lifecycle.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

const settingsShape = z.record(z.string(), z.json());

export const loadSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ settings: string | null }> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("settings")
      .eq("user_id", userId)
      .single()
      .throwOnError();
    // Return serialized JSON to sidestep TanStack's record<string,unknown> serialization guard.
    return { settings: data?.settings ? JSON.stringify(data.settings) : null };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ settings: settingsShape }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ settings: data.settings as Json })
      .eq("user_id", userId)
      .select("user_id")
      .single();
    if (error) throw new Error("Settings could not be saved. Please retry.");
    return { ok: true };
  });
