import { useQuests, emptyQuestState, type QuestsState, type LegacyEvent } from "./quests-store";
import type { Quest, Category, QuestType, Priority, Difficulty } from "./demo-data";
import { EMPTY_ONBOARDING } from "./onboarding-types";
import { useAuth } from "./auth-store";
import { useSettings, DEFAULT_SETTINGS, type UserSettings } from "./settings-store";
import { createSyncClient } from "./sync-client";
import { readAccountState, writeAccountState, accountStorageKey } from "./account-storage";
import { migrateRecordIds } from "./record-ids";
import type { Tables, Json } from "@/integrations/supabase/types";

type QuestSnapshot = Pick<
  QuestsState,
  | "quests"
  | "character"
  | "events"
  | "unlockedAchievements"
  | "pendingDeletions"
  | "pendingEventDeletions"
  | "onboardingCompleted"
  | "onboardingProfile"
>;
type Save = { quests: QuestSnapshot; settings: UserSettings; dirty: boolean };
type Session = {
  userId: string;
  client: ReturnType<typeof createSyncClient>;
  abort: AbortController;
  revision: number;
  dirty: boolean;
  ready: boolean;
  running: boolean;
  muted: boolean;
  stop: (() => void)[];
  timer?: ReturnType<typeof setTimeout>;
};
let active: Session | null = null;
const current = (s: Session) => active === s && !s.abort.signal.aborted;

function snapshot(): QuestSnapshot {
  const s = useQuests.getState();
  return {
    quests: s.quests,
    character: s.character,
    events: s.events,
    unlockedAchievements: s.unlockedAchievements,
    pendingDeletions: s.pendingDeletions,
    pendingEventDeletions: s.pendingEventDeletions,
    onboardingCompleted: s.onboardingCompleted,
    onboardingProfile: s.onboardingProfile,
  };
}

function persist(s: Session) {
  if (!current(s)) return;
  writeAccountState(localStorage, s.userId, "save", {
    quests: snapshot(),
    settings: useSettings.getState().settings,
    dirty: s.dirty,
  } satisfies Save);
}

function report(s: Session, error: unknown) {
  if (!current(s)) return;
  console.error("Cloud sync failed", error);
  useAuth
    .getState()
    .setSyncError("Changes have not synced. Your local save is retained; retry when connected.");
}

function questFromRow(r: Tables<"quests">): Quest {
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
function questToRow(userId: string, q: Quest) {
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
  };
}
function eventFromRow(r: Tables<"legacy_events">): LegacyEvent {
  const base = { id: r.id, ts: Date.parse(r.occurred_at) };
  const meta = (r.metadata ?? {}) as Record<string, Json>;
  switch (r.kind) {
    case "completion":
      return {
        ...base,
        kind: "completion",
        questId: r.quest_id!,
        title: String(meta.title ?? ""),
        category: r.category as Category,
        type: meta.type as QuestType,
        xp: r.xp_earned ?? 0,
      };
    case "levelup":
      return { ...base, kind: "levelup", level: Number(meta.level ?? 1) };
    case "achievement":
      return { ...base, kind: "achievement", achievementId: String(meta.achievementId ?? "") };
    default:
      return { ...base, kind: "journal", title: String(meta.title ?? ""), body: r.content ?? "" };
  }
}
function eventToRow(userId: string, e: LegacyEvent) {
  const base = {
    id: e.id,
    user_id: userId,
    kind: e.kind,
    occurred_at: new Date(e.ts).toISOString(),
  };
  if (e.kind === "completion")
    return {
      ...base,
      quest_id: e.questId,
      category: e.category,
      xp_earned: e.xp,
      metadata: { title: e.title, type: e.type },
    };
  if (e.kind === "levelup") return { ...base, metadata: { level: e.level } };
  if (e.kind === "achievement") return { ...base, metadata: { achievementId: e.achievementId } };
  return { ...base, content: e.body, metadata: { title: e.title } };
}

function mergeById<T extends { id: string }>(remote: T[], local: T[], deleted: string[]) {
  return [...new Map([...remote, ...local].map((v) => [v.id, v])).values()].filter(
    (v) => !deleted.includes(v.id),
  );
}

export function detachSync() {
  const s = active;
  if (s) {
    s.abort.abort();
    clearTimeout(s.timer);
    s.stop.forEach((stop) => stop());
  }
  active = null;
  useQuests.setState(emptyQuestState());
  useSettings.setState({ settings: structuredClone(DEFAULT_SETTINGS), loaded: false });
  useAuth.getState().setCloudLoaded(false);
  useAuth.getState().setSyncError(null);
}

export async function attachSync(userId: string, accessToken: string) {
  if (active?.userId === userId) {
    active.client = createSyncClient(accessToken);
    return;
  }
  detachSync();
  const s: Session = {
    userId,
    client: createSyncClient(accessToken),
    abort: new AbortController(),
    revision: 0,
    dirty: false,
    ready: false,
    running: false,
    muted: false,
    stop: [],
  };
  active = s;
  try {
    const cached = readAccountState<Save>(localStorage, userId, "save");
    if (cached) {
      // Preserve original bytes before upgrading IDs. Never read unowned v1 data.
      const backupKey = accountStorageKey(userId, "pre-id-migration");
      if (!localStorage.getItem(backupKey)) {
        localStorage.setItem(backupKey, localStorage.getItem(accountStorageKey(userId, "save"))!);
      }
      const migrated = migrateRecordIds(cached.quests);
      s.dirty = cached.dirty || JSON.stringify(migrated) !== JSON.stringify(cached.quests);
      useQuests.setState(migrated);
      useSettings.getState().hydrate(cached.settings);
      persist(s);
    }
    const changed = () => {
      if (!current(s) || s.muted) return;
      s.dirty = true;
      s.revision++;
      try {
        persist(s);
      } catch (error) {
        report(s, error);
      }
      schedule(s);
    };
    s.stop.push(useQuests.subscribe(changed), useSettings.subscribe(changed));
    const online = () => {
      void retrySync();
    };
    window.addEventListener("online", online);
    s.stop.push(() => window.removeEventListener("online", online));
    await pull(s);
  } catch (error) {
    report(s, error);
  }
}

async function pull(s: Session) {
  const client = s.client;
  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", s.userId)
    .abortSignal(s.abort.signal)
    .single()
    .throwOnError();
  if (!current(s)) return;
  // Paginate rather than replacing local data with a silently truncated result.
  async function all<T extends "quests" | "legacy_events" | "user_achievements">(table: T) {
    const rows: Tables<T>[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data } = await (client as any)
        .from(table)
        .select("*")
        .eq("user_id", s.userId)
        .order("id")
        .range(offset, offset + 499)
        .abortSignal(s.abort.signal)
        .throwOnError();
      if (!current(s)) throw new Error("Account changed");
      rows.push(...(data as Tables<T>[]));
      if (data.length < 500) return rows;
    }
  }
  const [quests, events, achievements] = await Promise.all([
    all("quests"),
    all("legacy_events"),
    all("user_achievements"),
  ]);
  if (!current(s) || !profile) return;
  const local = snapshot();
  const char = profile.character_state as Record<string, Json>;
  const remote: QuestSnapshot = {
    ...emptyQuestState(),
    quests: quests.map(questFromRow),
    events: events.map(eventFromRow),
    character: {
      ...emptyQuestState().character,
      ...char,
      categoryXp: {
        ...emptyQuestState().character.categoryXp,
        ...(profile.category_xp as Record<Category, number>),
      },
      level: profile.level,
      name: profile.display_name ?? "Player",
      title: profile.character_title ?? "Player",
    },
    onboardingCompleted: !!char.onboardingCompleted,
    onboardingProfile:
      (char.onboardingProfile as unknown as QuestSnapshot["onboardingProfile"]) ?? EMPTY_ONBOARDING,
    unlockedAchievements: achievements.map((a) => a.achievement_id),
  };
  s.muted = true;
  try {
    useQuests.setState(
      s.dirty
        ? {
            ...local,
            quests: mergeById(remote.quests, local.quests, local.pendingDeletions),
            events: mergeById(remote.events, local.events, local.pendingEventDeletions),
            unlockedAchievements: [
              ...new Set([...remote.unlockedAchievements, ...local.unlockedAchievements]),
            ],
          }
        : remote,
    );
    if (!s.dirty)
      useSettings.getState().hydrate(profile.settings as unknown as Partial<UserSettings>);
  } finally {
    s.muted = false;
  }
  persist(s);
  s.ready = true;
  useAuth.getState().setCloudLoaded(true);
  useAuth.getState().setSyncError(null);
  if (s.dirty) await push(s);
}

function schedule(s: Session, delay = 600) {
  clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    void push(s);
  }, delay);
}

export async function retrySync() {
  const s = active;
  if (!s) return;
  try {
    if (!s.ready) await pull(s);
    else await push(s);
  } catch (error) {
    report(s, error);
  }
}

async function push(s: Session) {
  if (!current(s) || !s.ready || !s.dirty || s.running) return;
  s.running = true;
  const revision = s.revision;
  const state = snapshot();
  const settings = useSettings.getState().settings;
  const client = s.client;
  try {
    await client
      .from("profiles")
      .update({
        display_name: state.character.name,
        character_title: state.character.title,
        level: state.character.level,
        total_xp: state.character.xp,
        category_xp: state.character.categoryXp,
        character_state: {
          ...state.character,
          onboardingCompleted: state.onboardingCompleted,
          onboardingProfile: state.onboardingProfile,
        } as unknown as Json,
        settings: settings as unknown as Json,
      })
      .eq("user_id", s.userId)
      .select("user_id")
      .abortSignal(s.abort.signal)
      .single()
      .throwOnError();
    if (!current(s)) return;
    if (state.quests.length)
      await client
        .from("quests")
        .upsert(state.quests.map((q) => questToRow(s.userId, q)))
        .abortSignal(s.abort.signal)
        .throwOnError();
    if (!current(s)) return;
    if (state.events.length)
      await client
        .from("legacy_events")
        .upsert(state.events.map((e) => eventToRow(s.userId, e)))
        .abortSignal(s.abort.signal)
        .throwOnError();
    if (!current(s)) return;
    if (state.unlockedAchievements.length)
      await client
        .from("user_achievements")
        .upsert(
          state.unlockedAchievements.map((achievement_id) => ({
            user_id: s.userId,
            achievement_id,
          })),
          { onConflict: "user_id,achievement_id" },
        )
        .abortSignal(s.abort.signal)
        .throwOnError();
    if (!current(s)) return;
    if (state.pendingDeletions.length)
      await client
        .from("quests")
        .delete()
        .eq("user_id", s.userId)
        .in("id", state.pendingDeletions)
        .abortSignal(s.abort.signal)
        .throwOnError();
    if (!current(s)) return;
    if (state.pendingEventDeletions.length)
      await client
        .from("legacy_events")
        .delete()
        .eq("user_id", s.userId)
        .in("id", state.pendingEventDeletions)
        .abortSignal(s.abort.signal)
        .throwOnError();
    if (!current(s)) return;
    // Acknowledge only this snapshot's deletions after every write succeeded.
    s.muted = true;
    try {
      useQuests
        .getState()
        .clearPendingDeletions(state.pendingDeletions, state.pendingEventDeletions);
    } finally {
      s.muted = false;
    }
    s.dirty = s.revision !== revision;
    persist(s);
    useAuth.getState().setSyncError(null);
  } catch (error) {
    s.dirty = true;
    report(s, error);
    if (current(s)) schedule(s, 15000);
  } finally {
    s.running = false;
    if (current(s) && s.revision !== revision) schedule(s);
  }
}
