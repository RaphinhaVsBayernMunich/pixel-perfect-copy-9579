/**
 * Server-side analytics persistence. The client `track()` helper batches
 * events and flushes them here on an interval or on tab hide.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const eventSchema = z.object({
  event: z.string().min(1).max(64),
  properties: z.record(z.unknown()).default({}),
  session_id: z.string().max(128).optional(),
  platform: z.string().max(32).optional(),
  occurred_at: z.string().datetime().optional(),
});

const inputSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

export const recordAnalyticsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.events.map((e) => ({
      user_id: userId,
      event: e.event,
      properties: e.properties as any,
      session_id: e.session_id ?? null,
      platform: e.platform ?? null,
      occurred_at: e.occurred_at ?? new Date().toISOString(),
    }));
    const { error } = await supabase.from("analytics_events").insert(rows as any);
    if (error) {
      // Non-fatal — analytics loss must never break the app.
      console.warn("analytics_events insert failed", error);
      return { ok: false as const, inserted: 0 };
    }
    return { ok: true as const, inserted: rows.length };
  });
