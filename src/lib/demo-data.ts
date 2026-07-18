// Local seed data for Phase 1. Replaced by Lovable Cloud in Phase 5.

export type QuestType = "main" | "daily" | "weekly" | "side" | "boss";
export type Category =
  | "fitness"
  | "business"
  | "academics"
  | "coding"
  | "football"
  | "creativity"
  | "finance"
  | "health"
  | "relationships"
  | "lifestyle";
export type Priority = "critical" | "high" | "medium" | "low" | "someday";
export type Difficulty = "very-easy" | "easy" | "medium" | "hard" | "extreme";

export interface Quest {
  id: string;
  title: string;
  description?: string;
  type: QuestType;
  category: Category;
  priority: Priority;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xp: number;
  deadline?: string; // ISO
  scheduledFor?: string; // ISO date (YYYY-MM-DD)
  startTime?: string; // HH:MM (24h) — optional time-block
  completed?: boolean;
  progress?: number; // 0..1 for main/weekly
  subtasksDone?: number;
  subtasksTotal?: number;
}

export interface Character {
  name: string;
  title: string;
  level: number;
  xp: number;
  xpToNext: number;
  momentum: number; // 0..1
  streakDays: number;
  season: string;
  categoryXp: Record<Category, number>;
}

export const character: Character = {
  name: "Player One",
  title: "Strategist",
  level: 24,
  xp: 12480,
  xpToNext: 15000,
  momentum: 0.82,
  streakDays: 17,
  season: "Season of Momentum",
  categoryXp: {
    fitness: 2140,
    business: 1980,
    academics: 2860,
    coding: 2320,
    football: 1120,
    creativity: 640,
    finance: 480,
    health: 720,
    relationships: 140,
    lifestyle: 80,
  },
};

const today = new Date().toISOString().slice(0, 10);
function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const quests: Quest[] = [
  {
    id: "q1",
    title: "Launch QuestOS beta",
    type: "main",
    category: "business",
    priority: "critical",
    difficulty: "extreme",
    estimatedMinutes: 60 * 40,
    xp: 5000,
    progress: 0.62,
    subtasksDone: 18,
    subtasksTotal: 29,
    deadline: "2026-08-14",
  },
  {
    id: "q2",
    title: "Score at the regional trials",
    type: "boss",
    category: "football",
    priority: "high",
    difficulty: "hard",
    estimatedMinutes: 240,
    xp: 3000,
    deadline: "2026-07-28",
  },
  {
    id: "q3",
    title: "Study organic chemistry",
    type: "daily",
    category: "academics",
    priority: "high",
    difficulty: "medium",
    estimatedMinutes: 90,
    xp: 150,
    scheduledFor: today,
  },
  {
    id: "q4",
    title: "Morning run — 5km",
    type: "daily",
    category: "fitness",
    priority: "medium",
    difficulty: "easy",
    estimatedMinutes: 35,
    xp: 80,
    scheduledFor: today,
    completed: true,
  },
  {
    id: "q5",
    title: "Ship auth flow refactor",
    type: "daily",
    category: "coding",
    priority: "high",
    difficulty: "hard",
    estimatedMinutes: 180,
    xp: 220,
    scheduledFor: today,
  },
  {
    id: "q6",
    title: "Read 20 pages",
    type: "daily",
    category: "academics",
    priority: "low",
    difficulty: "very-easy",
    estimatedMinutes: 25,
    xp: 40,
    scheduledFor: today,
  },
  {
    id: "q7",
    title: "Journal — evening reflection",
    type: "daily",
    category: "lifestyle",
    priority: "medium",
    difficulty: "very-easy",
    estimatedMinutes: 10,
    xp: 30,
    scheduledFor: today,
  },
  {
    id: "q8",
    title: "Complete 5 gym sessions",
    type: "weekly",
    category: "fitness",
    priority: "high",
    difficulty: "medium",
    estimatedMinutes: 60 * 5,
    xp: 500,
    progress: 0.6,
  },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  fitness: "Fitness",
  business: "Business",
  academics: "Academics",
  coding: "Coding",
  football: "Football",
  creativity: "Creativity",
  finance: "Finance",
  health: "Health",
  relationships: "Relationships",
  lifestyle: "Lifestyle",
};

export const CATEGORY_TOKEN: Record<Category, string> = {
  fitness: "var(--color-cat-fitness)",
  business: "var(--color-cat-business)",
  academics: "var(--color-cat-academics)",
  coding: "var(--color-cat-coding)",
  football: "var(--color-cat-football)",
  creativity: "var(--color-cat-creativity)",
  finance: "var(--color-cat-finance)",
  health: "var(--color-cat-health)",
  relationships: "var(--color-cat-relationships)",
  lifestyle: "var(--color-cat-lifestyle)",
};

export function todayQuests() {
  return quests.filter((q) => q.type === "daily");
}

export function mainQuests() {
  return quests.filter((q) => q.type === "main");
}

export function bossBattles() {
  return quests.filter((q) => q.type === "boss");
}

export function weeklyQuests() {
  return quests.filter((q) => q.type === "weekly");
}
