import { create } from "zustand";
import { isUuid, newRecordId } from "./record-ids";
import {
  character as seedCharacter,
  type Character,
  type Quest,
  type Category,
  type Priority,
  type Difficulty,
  type QuestType,
} from "./demo-data";
import { evaluateAchievements } from "./achievements";
import { EMPTY_ONBOARDING, type OnboardingProfile } from "./onboarding-types";

export type { Quest, Category, Priority, Difficulty, QuestType, Character };
export type { OnboardingProfile };

const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  "very-easy": 20,
  easy: 50,
  medium: 120,
  hard: 250,
  extreme: 500,
};

const XP_BY_TYPE: Record<QuestType, number> = {
  daily: 1,
  side: 0.8,
  weekly: 3,
  main: 15,
  boss: 20,
};

export function suggestXp(type: QuestType, difficulty: Difficulty, priority: Priority) {
  const base = XP_BY_DIFFICULTY[difficulty] * XP_BY_TYPE[type];
  const bump =
    priority === "critical"
      ? 1.5
      : priority === "high"
        ? 1.2
        : priority === "low"
          ? 0.9
          : priority === "someday"
            ? 0.75
            : 1;
  return Math.round(base * bump);
}

export type LegacyEvent =
  | {
      id: string;
      ts: number;
      kind: "completion";
      questId: string;
      title: string;
      category: Category;
      type: QuestType;
      xp: number;
    }
  | { id: string; ts: number; kind: "levelup"; level: number }
  | { id: string; ts: number; kind: "achievement"; achievementId: string }
  | { id: string; ts: number; kind: "journal"; title: string; body: string };

export interface QuestsState {
  quests: Quest[];
  character: Character;
  events: LegacyEvent[];
  unlockedAchievements: string[];
  pendingDeletions: string[];
  pendingEventDeletions: string[];
  lastCompletion?: { questId: string; ts: number };
  onboardingCompleted: boolean;
  onboardingProfile: OnboardingProfile;
  add: (q: Omit<Quest, "id"> & { id?: string }) => Quest;
  update: (id: string, patch: Partial<Quest>) => void;
  remove: (id: string) => void;
  complete: (id: string) => void;
  uncomplete: (id: string) => void;
  archive: (id: string) => void;
  duplicate: (id: string) => void;
  clearCompletion: () => void;
  addJournal: (title: string, body: string) => void;
  removeEvent: (id: string) => void;
  syncAchievements: () => void;
  hydrate: (
    patch: Partial<
      Pick<
        QuestsState,
        | "quests"
        | "character"
        | "events"
        | "unlockedAchievements"
        | "onboardingCompleted"
        | "onboardingProfile"
      >
    >,
  ) => void;
  clearPendingDeletions: (ids: string[], eventIds: string[]) => void;
  setOnboarding: (profile: OnboardingProfile, completed: boolean) => void;
}

const uid = newRecordId;

export function emptyQuestState() {
  return {
    quests: [] as Quest[],
    character: {
      ...seedCharacter,
      name: "Player",
      level: 1,
      xp: 0,
      xpToNext: 100,
      momentum: 0,
      streakDays: 0,
      categoryXp: Object.fromEntries(
        Object.keys(seedCharacter.categoryXp).map((key) => [key, 0]),
      ) as Record<Category, number>,
    },
    events: [] as LegacyEvent[],
    unlockedAchievements: [] as string[],
    pendingDeletions: [] as string[],
    pendingEventDeletions: [] as string[],
    lastCompletion: undefined,
    onboardingCompleted: false,
    onboardingProfile: { ...EMPTY_ONBOARDING },
  };
}

export const useQuests = create<QuestsState>()((set, get) => ({
  ...emptyQuestState(),

  setOnboarding: (profile, completed) =>
    set({ onboardingProfile: profile, onboardingCompleted: completed }),

  add: (q) => {
    const quest: Quest = { ...q, id: q.id && isUuid(q.id) ? q.id : uid() };
    set((s) => ({ quests: [quest, ...s.quests] }));
    return quest;
  },

  update: (id, patch) =>
    set((s) => ({
      quests: s.quests.map((q) => (q.id === id ? { ...q, ...patch, id: q.id } : q)),
    })),

  remove: (id) =>
    set((s) => ({
      quests: s.quests.filter((q) => q.id !== id),
      pendingDeletions: [...s.pendingDeletions, id],
    })),

  complete: (id) => {
    const q = get().quests.find((x) => x.id === id);
    if (!q || q.completed) return;
    set((s) => {
      const nextXp = s.character.xp + q.xp;
      const nextCatXp = {
        ...s.character.categoryXp,
        [q.category]: (s.character.categoryXp[q.category] ?? 0) + q.xp,
      };
      let level = s.character.level;
      let xpToNext = s.character.xpToNext;
      let remaining = nextXp;
      const levelUps: number[] = [];
      while (remaining >= xpToNext) {
        remaining -= xpToNext;
        level += 1;
        levelUps.push(level);
        xpToNext = Math.round(xpToNext * 1.15);
      }
      const now = Date.now();
      const newEvents: LegacyEvent[] = [
        {
          id: uid(),
          ts: now,
          kind: "completion",
          questId: id,
          title: q.title,
          category: q.category,
          type: q.type,
          xp: q.xp,
        },
        ...levelUps.map((lv, i) => ({
          id: uid(),
          ts: now + i + 1,
          kind: "levelup" as const,
          level: lv,
        })),
      ];
      return {
        quests: s.quests.map((x) => (x.id === id ? { ...x, completed: true } : x)),
        character: {
          ...s.character,
          xp: remaining,
          level,
          xpToNext,
          categoryXp: nextCatXp,
          momentum: Math.min(1, s.character.momentum + 0.02),
        },
        events: [...newEvents, ...s.events],
        lastCompletion: { questId: id, ts: now },
      };
    });
    get().syncAchievements();
  },

  uncomplete: (id) => {
    const q = get().quests.find((x) => x.id === id);
    if (!q || !q.completed) return;
    set((s) => ({
      quests: s.quests.map((x) => (x.id === id ? { ...x, completed: false } : x)),
      character: {
        ...s.character,
        xp: Math.max(0, s.character.xp - q.xp),
        categoryXp: {
          ...s.character.categoryXp,
          [q.category]: Math.max(0, (s.character.categoryXp[q.category] ?? 0) - q.xp),
        },
      },
    }));
  },

  archive: (id) =>
    set((s) => ({
      quests: s.quests.filter((q) => q.id !== id),
      pendingDeletions: [...s.pendingDeletions, id],
    })),

  duplicate: (id) => {
    const q = get().quests.find((x) => x.id === id);
    if (!q) return;
    const copy: Quest = { ...q, id: uid(), completed: false, title: `${q.title} (copy)` };
    set((s) => ({ quests: [copy, ...s.quests] }));
  },

  clearCompletion: () => set({ lastCompletion: undefined }),

  addJournal: (title, body) =>
    set((s) => ({
      events: [
        {
          id: uid(),
          ts: Date.now(),
          kind: "journal",
          title: title.trim() || "Untitled entry",
          body: body.trim(),
        },
        ...s.events,
      ],
    })),

  removeEvent: (id) =>
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      pendingEventDeletions: [...s.pendingEventDeletions, id],
    })),

  syncAchievements: () => {
    const s = get();
    const completions = s.quests.filter((q) => q.completed);
    const completionsByType = {
      main: 0,
      daily: 0,
      weekly: 0,
      side: 0,
      boss: 0,
    } as Record<QuestType, number>;
    const completionsByCategory = {} as Record<Category, number>;
    for (const q of completions) {
      completionsByType[q.type]++;
      completionsByCategory[q.category] = (completionsByCategory[q.category] ?? 0) + 1;
    }
    const totalXp = Object.values(s.character.categoryXp).reduce((a, b) => a + b, 0);
    const snap = {
      totalCompletions: completions.length,
      completionsByType,
      completionsByCategory: completionsByCategory as Record<Category, number>,
      categoryXp: s.character.categoryXp,
      level: s.character.level,
      streakDays: s.character.streakDays,
      totalXp,
    };
    const unlocked = evaluateAchievements(snap);
    const prev = new Set(s.unlockedAchievements);
    const newlyUnlocked = [...unlocked].filter((id) => !prev.has(id));
    if (newlyUnlocked.length === 0 && unlocked.size === prev.size) return;
    const now = Date.now();
    const newEvents: LegacyEvent[] = newlyUnlocked.map((achievementId, i) => ({
      id: uid(),
      ts: now + i,
      kind: "achievement",
      achievementId,
    }));
    set({
      unlockedAchievements: [...unlocked],
      events: [...newEvents, ...s.events],
    });
  },

  hydrate: (patch) => set((s) => ({ ...s, ...patch })),
  clearPendingDeletions: (ids, eventIds) =>
    set((s) => ({
      pendingDeletions: s.pendingDeletions.filter((id) => !ids.includes(id)),
      pendingEventDeletions: s.pendingEventDeletions.filter((id) => !eventIds.includes(id)),
    })),
}));

export interface QuestTemplate {
  id: string;
  name: string;
  emoji: string;
  quest: Omit<Quest, "id">;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "tpl-morning",
    name: "Morning Routine",
    emoji: "☀️",
    quest: {
      title: "Morning routine",
      type: "daily",
      category: "lifestyle",
      priority: "medium",
      difficulty: "easy",
      estimatedMinutes: 30,
      xp: 60,
      scheduledFor: new Date().toISOString().slice(0, 10),
    },
  },
  {
    id: "tpl-gym",
    name: "Gym Session",
    emoji: "🏋️",
    quest: {
      title: "Gym session",
      type: "daily",
      category: "fitness",
      priority: "high",
      difficulty: "medium",
      estimatedMinutes: 75,
      xp: 150,
    },
  },
  {
    id: "tpl-code",
    name: "Coding Sprint",
    emoji: "⌨️",
    quest: {
      title: "Coding sprint",
      type: "daily",
      category: "coding",
      priority: "high",
      difficulty: "hard",
      estimatedMinutes: 120,
      xp: 300,
    },
  },
  {
    id: "tpl-study",
    name: "Study Session",
    emoji: "📚",
    quest: {
      title: "Study session",
      type: "daily",
      category: "academics",
      priority: "high",
      difficulty: "medium",
      estimatedMinutes: 90,
      xp: 180,
    },
  },
  {
    id: "tpl-football",
    name: "Football Training",
    emoji: "⚽",
    quest: {
      title: "Football training",
      type: "daily",
      category: "football",
      priority: "medium",
      difficulty: "medium",
      estimatedMinutes: 90,
      xp: 160,
    },
  },
  {
    id: "tpl-read",
    name: "Read 20 pages",
    emoji: "📖",
    quest: {
      title: "Read 20 pages",
      type: "daily",
      category: "academics",
      priority: "low",
      difficulty: "very-easy",
      estimatedMinutes: 25,
      xp: 40,
    },
  },
];
