import type { Category } from "./demo-data";

export type Profession =
  | "student"
  | "athlete"
  | "developer"
  | "entrepreneur"
  | "professional"
  | "freelancer"
  | "creator"
  | "designer"
  | "artist"
  | "teacher"
  | "healthcare"
  | "custom";

export type Chronotype = "morning" | "night" | "flexible" | "balanced";
export type PlanningStyle = "strict" | "balanced" | "flexible";
export type CoachStyle = "gentle" | "balanced" | "challenging" | "minimal";
export type FocusLength = 25 | 45 | 60 | 90;
export type Theme = "dark" | "light" | "cyberpunk" | "minimal" | "forest" | "space" | "football";
export type CelebrationStyle = "mission-passed" | "modern" | "silent";

export interface OnboardingProfile {
  // Basics
  preferredName?: string;
  age?: number;
  country?: string;
  timezone?: string;
  units?: "metric" | "imperial";

  // Profession
  profession?: Profession;
  professionDetails?: Record<string, string>;

  // Goals
  yearGoal?: string;
  fiveYearGoal?: string;
  dreamLife?: string;

  // Interests / skills
  interests: string[];
  skills: string[];

  // Schedule
  wakeTime?: string;
  sleepTime?: string;
  workHours?: string;
  focusHours?: string;

  // Productivity
  chronotype?: Chronotype;
  focusLength?: FocusLength;
  planningStyle?: PlanningStyle;
  coachStyle?: CoachStyle;

  // Personalization
  theme?: Theme;
  accent?: string;
  celebration?: CelebrationStyle;

  // AI prefs
  aiFeatures?: Record<string, boolean>;
}

export const EMPTY_ONBOARDING: OnboardingProfile = {
  interests: [],
  skills: [],
};

export const PROFESSIONS: { id: Profession; label: string; emoji: string }[] = [
  { id: "student", label: "Student", emoji: "🎓" },
  { id: "athlete", label: "Athlete", emoji: "🏅" },
  { id: "developer", label: "Developer", emoji: "💻" },
  { id: "entrepreneur", label: "Entrepreneur", emoji: "🚀" },
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "freelancer", label: "Freelancer", emoji: "🧭" },
  { id: "creator", label: "Creator", emoji: "🎬" },
  { id: "designer", label: "Designer", emoji: "🎨" },
  { id: "artist", label: "Artist", emoji: "🖌️" },
  { id: "teacher", label: "Teacher", emoji: "📚" },
  { id: "healthcare", label: "Healthcare", emoji: "🩺" },
  { id: "custom", label: "Something else", emoji: "✨" },
];

export const INTEREST_OPTIONS: { label: string; category: Category }[] = [
  { label: "Coding", category: "coding" },
  { label: "Football", category: "football" },
  { label: "Gym", category: "fitness" },
  { label: "Business", category: "business" },
  { label: "Finance", category: "finance" },
  { label: "Reading", category: "academics" },
  { label: "Music", category: "creativity" },
  { label: "Art", category: "creativity" },
  { label: "Writing", category: "creativity" },
  { label: "Photography", category: "creativity" },
  { label: "Gaming", category: "lifestyle" },
  { label: "Content Creation", category: "creativity" },
  { label: "Travel", category: "lifestyle" },
  { label: "Cooking", category: "health" },
  { label: "Languages", category: "academics" },
  { label: "Science", category: "academics" },
  { label: "Technology", category: "coding" },
];

export const SKILL_OPTIONS = [
  "Discipline",
  "Confidence",
  "Leadership",
  "Creativity",
  "Communication",
  "Health",
  "Strength",
  "Academics",
  "Coding",
  "Football",
  "Business",
  "Finance",
  "Languages",
];

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "dark", label: "Dark", swatch: "linear-gradient(135deg,#0a0a1a,#1e1e5a)" },
  { id: "light", label: "Light", swatch: "linear-gradient(135deg,#fafbfc,#e8ecf1)" },
  { id: "cyberpunk", label: "Cyberpunk", swatch: "linear-gradient(135deg,#0d0221,#ff006e)" },
  { id: "minimal", label: "Minimal", swatch: "linear-gradient(135deg,#f5f3ee,#0d0d0d)" },
  { id: "forest", label: "Forest", swatch: "linear-gradient(135deg,#1a3c2a,#5a8a5c)" },
  { id: "space", label: "Space", swatch: "linear-gradient(135deg,#0a0a1a,#4f46e5)" },
  { id: "football", label: "Football", swatch: "linear-gradient(135deg,#052e16,#22c55e)" },
];

export const CELEBRATIONS: { id: CelebrationStyle; label: string; blurb: string }[] = [
  {
    id: "mission-passed",
    label: "Mission Passed",
    blurb: "Cinematic QuestOS banner + original reward chime.",
  },

  { id: "modern", label: "Modern", blurb: "Minimal premium animation. Soft, elegant." },
  { id: "silent", label: "Silent", blurb: "No animation, no sound. Instant." },
];

export const AI_FEATURES = [
  {
    id: "memory",
    label: "AI Memory",
    desc: "Save preferences after enabling AI Memory separately.",
  },
  {
    id: "dailyPlanning",
    label: "Daily Planning",
    desc: "Request a morning brief or a schedule proposal.",
  },
  {
    id: "weeklyReview",
    label: "Weekly Reviews",
    desc: "Review your weekly progress in Analytics.",
  },
  {
    id: "goalSimulator",
    label: "Goal Simulator",
    desc: "Explore a goal with your available time.",
  },
  {
    id: "autoQuests",
    label: "Quest Suggestions",
    desc: "Request quests for a goal and choose which to add.",
  },
  {
    id: "scheduleOptimizer",
    label: "Schedule Planning",
    desc: "Review a proposed schedule before applying it.",
  },
];
