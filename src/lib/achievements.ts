import type { Category, QuestType } from "./demo-data";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "legend";
  category?: Category;
  /** returns true when unlocked given the current stats snapshot */
  check: (s: AchievementSnapshot) => boolean;
}

export interface AchievementSnapshot {
  totalCompletions: number;
  completionsByType: Record<QuestType, number>;
  completionsByCategory: Record<Category, number>;
  categoryXp: Record<Category, number>;
  level: number;
  streakDays: number;
  totalXp: number;
}

const catAch = (
  category: Category,
  label: string,
  threshold: number,
  tier: Achievement["tier"],
): Achievement => ({
  id: `cat-${category}-${threshold}`,
  name: label,
  description: `Reach ${threshold.toLocaleString()} XP in ${category}.`,
  tier,
  category,
  check: (s) => (s.categoryXp[category] ?? 0) >= threshold,
});

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-step",
    name: "First Step",
    description: "Complete your very first quest.",
    tier: "bronze",
    check: (s) => s.totalCompletions >= 1,
  },
  {
    id: "ten-done",
    name: "Getting Warm",
    description: "Complete 10 quests.",
    tier: "bronze",
    check: (s) => s.totalCompletions >= 10,
  },
  {
    id: "fifty-done",
    name: "Half a Hundred",
    description: "Complete 50 quests.",
    tier: "silver",
    check: (s) => s.totalCompletions >= 50,
  },
  {
    id: "hundred-done",
    name: "Centurion",
    description: "Complete 100 quests.",
    tier: "gold",
    check: (s) => s.totalCompletions >= 100,
  },
  {
    id: "level-10",
    name: "Rising",
    description: "Reach life level 10.",
    tier: "bronze",
    check: (s) => s.level >= 10,
  },
  {
    id: "level-25",
    name: "Quarter Century",
    description: "Reach life level 25.",
    tier: "silver",
    check: (s) => s.level >= 25,
  },
  {
    id: "level-50",
    name: "Ascendant",
    description: "Reach life level 50.",
    tier: "gold",
    check: (s) => s.level >= 50,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day streak.",
    tier: "bronze",
    check: (s) => s.streakDays >= 7,
  },
  {
    id: "streak-30",
    name: "Unbroken",
    description: "Maintain a 30-day streak.",
    tier: "gold",
    check: (s) => s.streakDays >= 30,
  },
  {
    id: "boss-slayer",
    name: "Boss Slayer",
    description: "Defeat your first Boss Battle.",
    tier: "silver",
    check: (s) => (s.completionsByType.boss ?? 0) >= 1,
  },
  {
    id: "main-arc",
    name: "Main Arc",
    description: "Complete a Main Quest.",
    tier: "silver",
    check: (s) => (s.completionsByType.main ?? 0) >= 1,
  },
  {
    id: "polymath",
    name: "Polymath",
    description: "Earn XP in 5 different categories.",
    tier: "silver",
    check: (s) =>
      Object.values(s.categoryXp).filter((v) => v > 0).length >= 5,
  },
  catAch("fitness", "Iron Body", 1000, "silver"),
  catAch("coding", "Code Poet", 1000, "silver"),
  catAch("academics", "Scholar", 1000, "silver"),
  catAch("business", "Operator", 1000, "silver"),
  catAch("football", "Baller", 1000, "silver"),
  catAch("creativity", "Muse", 500, "bronze"),
  {
    id: "xp-10k",
    name: "Ten Thousand",
    description: "Earn 10,000 total XP.",
    tier: "gold",
    check: (s) => s.totalXp >= 10_000,
  },
  {
    id: "xp-50k",
    name: "Legend",
    description: "Earn 50,000 total XP.",
    tier: "legend",
    check: (s) => s.totalXp >= 50_000,
  },
];

export const TIER_COLOR: Record<Achievement["tier"], string> = {
  bronze: "oklch(0.68 0.13 55)",
  silver: "oklch(0.82 0.02 250)",
  gold: "oklch(0.82 0.15 85)",
  legend: "oklch(0.68 0.20 285)",
};

export function evaluateAchievements(snap: AchievementSnapshot): Set<string> {
  const unlocked = new Set<string>();
  for (const a of ACHIEVEMENTS) if (a.check(snap)) unlocked.add(a.id);
  return unlocked;
}
