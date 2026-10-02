import "@tanstack/react-start/server-only";
import { billingDb, requirePremium } from "../subscription/billing-db.server";
import {
  analytics,
  memorySchema,
  premiumPreferences,
  type MetricQuest,
  type Completion,
} from "./contracts";
export async function premiumData(userId: string) {
  await requirePremium(userId);
  const quests: MetricQuest[] = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await billingDb
      .from("quests")
      .select(
        "id,title,category,type,status,estimated_duration,scheduled_for,start_time,updated_at",
      )
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Quest data could not be loaded");
    quests.push(...(data as MetricQuest[]));
    if (data.length < 500) break;
    if (offset === 19500) throw new Error("Too many quests for this view; contact support");
  }
  const events: Completion[] = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await billingDb
      .from("legacy_events")
      .select("occurred_at,category,xp_earned,kind")
      .eq("user_id", userId)
      .gte("occurred_at", new Date(Date.now() - 366 * 86400000).toISOString())
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("History could not be loaded");
    events.push(...(data as Completion[]));
    if (data.length < 500) break;
    if (offset === 19500) throw new Error("Too much history for this view; contact support");
  }
  const { data, error } = await billingDb
    .from("premium_documents")
    .select("kind,value")
    .eq("user_id", userId);
  if (error) throw new Error("Premium data could not be loaded");
  const documents = Object.fromEntries((data ?? []).map((r) => [r.kind, r.value])) as Record<
    string,
    unknown
  >;
  return {
    userId,
    quests,
    events,
    metrics: analytics(quests, events),
    documentsJson: JSON.stringify(documents),
    memory: memorySchema.parse(documents.memory ?? { enabled: false, facts: [] }),
    preferences: premiumPreferences.parse(documents.preferences ?? {}),
  };
}
export async function coachMemory(userId: string) {
  const { getBillingSnapshot } = await import("../subscription/billing-db.server");
  const { data: profile, error: profileError } = await billingDb
    .from("profiles")
    .select("settings")
    .eq("user_id", userId)
    .single();
  if (profileError) throw new Error("Coach preferences could not be loaded");
  const raw = (profile.settings as { ai?: { tone?: string } })?.ai?.tone;
  const tone = ["warm", "sharp", "playful"].includes(raw ?? "") ? raw : "warm";
  if ((await getBillingSnapshot(userId)).tier === "free") return { tone };
  const { data, error } = await billingDb
    .from("premium_documents")
    .select("value")
    .eq("user_id", userId)
    .eq("kind", "memory")
    .maybeSingle();
  if (error) throw new Error("Memory could not be loaded");
  const memory = memorySchema.parse(data?.value ?? { enabled: false, facts: [] });
  if (!memory.enabled) return { tone };
  const { data: events, error: historyError } = await billingDb
    .from("legacy_events")
    .select("category,xp_earned,occurred_at")
    .eq("user_id", userId)
    .eq("kind", "completion")
    .order("occurred_at", { ascending: false })
    .limit(20);
  if (historyError) throw new Error("Memory history could not be loaded");
  return { tone, facts: memory.facts, recentCompletions: events };
}
