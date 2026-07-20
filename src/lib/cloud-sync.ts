import { supabase } from "@/integrations/supabase/client";
import { useQuests, type LegacyEvent } from "@/lib/quests-store";
import type { Quest, Category, QuestType, Priority, Difficulty } from "@/lib/demo-data";
import { character as seedCharacter } from "@/lib/demo-data";

type Row = Record<string, any>;

function questFromRow(r: Row): Quest {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    type: r.type as QuestType,
    category: r.category as Category,
    priority: r.priority as Priority,
    difficulty: r.difficulty as Difficulty,
    xp: r.xp_reward,
    estimatedMinutes: r.estimated_duration ?? 30,
    scheduledFor: r.scheduled_for ?? undefined,
    startTime: r.start_time ?? undefined,
    completed: r.status === "completed",
  };
}

function questToRow(userId: string, q: Quest): Row {
  return {
    id: q.id,
    user_id: userId,
    title: q.title,
    description: q.description ?? null,
    type: q.type,
    category: q.category,
    priority: q.priority,
    difficulty: q.difficulty,
    xp_reward: q.xp,
    estimated_duration: q.estimatedMinutes,
    scheduled_for: q.scheduledFor ?? null,
    start_time: q.startTime ?? null,
    status: q.completed ? "completed" : "active",
    completed_at: q.completed ? new Date().toISOString() : null,
  };
}

function eventFromRow(r: Row): LegacyEvent {
  const base = { id: r.id, ts: new Date(r.occurred_at).getTime() };
  const meta = r.metadata ?? {};
  switch (r.kind) {
    case "completion":
      return { ...base, kind: "completion", questId: r.quest_id, title: meta.title ?? "", category: r.category, type: meta.type, xp: r.xp_earned ?? 0 };
    case "levelup":
      return { ...base, kind: "levelup", level: meta.level ?? 1 };
    case "achievement":
      return { ...base, kind: "achievement", achievementId: meta.achievementId ?? "" };
    case "journal":
      return { ...base, kind: "journal", title: meta.title ?? "", body: r.content ?? "" };
    default:
      return { ...base, kind: "journal", title: "", body: "" };
  }
}

function eventToRow(userId: string, e: LegacyEvent): Row {
  const base: Row = { id: e.id, user_id: userId, kind: e.kind, occurred_at: new Date(e.ts).toISOString() };
  if (e.kind === "completion") return { ...base, quest_id: e.questId, category: e.category, xp_earned: e.xp, metadata: { title: e.title, type: e.type } };
  if (e.kind === "levelup") return { ...base, metadata: { level: e.level } };
  if (e.kind === "achievement") return { ...base, metadata: { achievementId: e.achievementId } };
  if (e.kind === "journal") return { ...base, content: e.body, metadata: { title: e.title } };
  return base;
}

let currentUserId: string | null = null;
let unsub: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pushedEventIds = new Set<string>();
const pushedAchievements = new Set<string>();

export async function attachSync(userId: string) {
  if (currentUserId === userId) return;
  await detachSync();
  currentUserId = userId;
  pushedEventIds.clear();
  pushedAchievements.clear();

  // Pull remote profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: remoteQuests } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: remoteEvents } = await supabase
    .from("legacy_events")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(500);

  const { data: remoteAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  const hasRemoteData =
    (remoteQuests && remoteQuests.length > 0) ||
    (profile?.character_state && Object.keys(profile.character_state).length > 0);

  const store = useQuests.getState();

  if (hasRemoteData) {
    const character = {
      ...seedCharacter,
      ...(profile?.character_state ?? {}),
      categoryXp: {
        ...seedCharacter.categoryXp,
        ...(profile?.category_xp ?? {}),
      },
      level: profile?.level ?? seedCharacter.level,
      name: profile?.display_name ?? seedCharacter.name,
      title: profile?.character_title ?? seedCharacter.title,
    };
    store.hydrate({
      quests: (remoteQuests ?? []).map(questFromRow),
      character,
      events: (remoteEvents ?? []).map(eventFromRow),
      unlockedAchievements: (remoteAchievements ?? []).map((r: Row) => r.achievement_id),
    });
    (remoteEvents ?? []).forEach((r: Row) => pushedEventIds.add(r.id));
    (remoteAchievements ?? []).forEach((r: Row) => pushedAchievements.add(r.achievement_id));
  } else {
    // First sign-in: push current local state up as seed
    await pushAll(userId);
  }

  // Subscribe to changes
  unsub = useQuests.subscribe(() => scheduleSync());
}

export async function detachSync() {
  if (unsub) unsub();
  unsub = null;
  currentUserId = null;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}

function scheduleSync() {
  if (!currentUserId) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (currentUserId) void pushAll(currentUserId);
  }, 600);
}

async function pushAll(userId: string) {
  const s = useQuests.getState();

  // Profile / character
  await supabase.from("profiles").upsert({
    user_id: userId,
    display_name: s.character.name,
    character_title: s.character.title,
    level: s.character.level,
    total_xp: s.character.xp,
    category_xp: s.character.categoryXp,
    character_state: {
      xp: s.character.xp,
      xpToNext: s.character.xpToNext,
      momentum: s.character.momentum,
      streakDays: s.character.streakDays,
      season: s.character.season,
    },
  }, { onConflict: "user_id" });

  // Quests upsert
  if (s.quests.length > 0) {
    await supabase.from("quests").upsert(
      s.quests.map((q) => questToRow(userId, q)),
    );
  }

  // Handle deletions
  const pending = s.pendingDeletions;
  if (pending && pending.length > 0) {
    await supabase.from("quests").delete().in("id", pending).eq("user_id", userId);
    useQuests.getState().clearPendingDeletions();
  }

  // New events only
  const newEvents = s.events.filter((e) => !pushedEventIds.has(e.id));
  if (newEvents.length > 0) {
    const { error } = await supabase.from("legacy_events").upsert(
      newEvents.map((e) => eventToRow(userId, e)),
    );
    if (!error) newEvents.forEach((e) => pushedEventIds.add(e.id));
  }

  // Achievements diff
  const newAchievements = s.unlockedAchievements.filter((a) => !pushedAchievements.has(a));
  if (newAchievements.length > 0) {
    await supabase.from("user_achievements").upsert(
      newAchievements.map((a) => ({ user_id: userId, achievement_id: a })),
      { onConflict: "user_id,achievement_id" },
    );
    newAchievements.forEach((a) => pushedAchievements.add(a));
  }
}
