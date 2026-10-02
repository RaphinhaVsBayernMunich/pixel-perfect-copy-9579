import { z } from "zod";
export const premiumPreferences = z.object({
  theme: z.enum(["default", "aurora", "ocean", "ember"]).default("default"),
  sound: z.enum(["silent", "rain", "forest", "space"]).default("silent"),
  widgets: z
    .array(z.enum(["focus", "category", "week", "forecast"]))
    .max(4)
    .default(["focus", "week"]),
  dailyMinutes: z.number().int().min(15).max(720).default(120),
});
export const memorySchema = z.object({
  enabled: z.boolean(),
  facts: z.array(z.string().trim().min(1).max(240)).max(30),
});
export const healthRecord = z.object({
  date: z.string().date(),
  steps: z.number().int().min(0).max(200000),
  sleepMinutes: z.number().int().min(0).max(1440),
  workoutMinutes: z.number().int().min(0).max(1440),
});
export const calendarRecord = z
  .object({
    id: z.string().max(200),
    title: z.string().max(240),
    start: z.string().datetime(),
    end: z.string().datetime(),
    questId: z.string().uuid().optional(),
  })
  .refine((r) => Date.parse(r.end) > Date.parse(r.start), "Event end must follow start");
export const premiumWrite = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("memory"), value: memorySchema }),
  z.object({ kind: z.literal("preferences"), value: premiumPreferences }),
  z.object({
    kind: z.literal("health"),
    value: z.object({
      records: z.array(healthRecord).max(366),
      source: z.enum(["health-connect", "csv"]),
    }),
  }),
  z.object({
    kind: z.literal("calendar"),
    value: z.object({ records: z.array(calendarRecord).max(300), calendarId: z.string().max(200) }),
  }),
  z.object({
    kind: z.literal("experiment"),
    value: z.object({
      name: z.string().min(3).max(100),
      category: z.string().max(40),
      start: z.string().date(),
      days: z.number().int().min(7).max(90),
      dailyMinutes: z.number().int().min(5).max(240),
    }),
  }),
]);
export const coachTask = z.discriminatedUnion("feature", [
  z.object({
    feature: z.literal("future_me"),
    goal: z.string().min(3).max(2000),
    years: z.union([z.literal(1), z.literal(5), z.literal(10)]),
    weeklyHours: z.number().min(1).max(80),
  }),
  z.object({
    feature: z.literal("goal_simulator"),
    goal: z.string().min(3).max(2000),
    effortHours: z.number().min(1).max(10000),
    weeklyHours: z.number().min(1).max(80),
  }),
  z.object({
    feature: z.literal("executive_assistant"),
    date: z.string().date(),
    startHour: z.number().int().min(0).max(23),
    availableMinutes: z.number().int().min(15).max(720),
  }),
]);
export type MetricQuest = {
  id: string;
  title: string;
  category: string;
  type: string;
  status: string;
  estimated_duration: number | null;
  scheduled_for: string | null;
  start_time: string | null;
  updated_at: string;
};
export type Completion = {
  occurred_at: string;
  category: string | null;
  xp_earned: number | null;
  kind: string;
};
export function analytics(quests: MetricQuest[], events: Completion[], now = Date.now()) {
  const completions = events.filter(
    (e) =>
      e.kind === "completion" &&
      Date.parse(e.occurred_at) <= now &&
      Date.parse(e.occurred_at) >= now - 366 * 86400000,
  );
  const since = (days: number) =>
    completions.filter((e) => Date.parse(e.occurred_at) >= now - days * 86400000);
  const categories = [
    ...new Set([
      ...quests.map((q) => q.category),
      ...completions.map((e) => e.category).filter((c): c is string => !!c),
    ]),
  ]
    .sort()
    .map((category) => ({
      category,
      active: quests.filter((q) => q.category === category && q.status === "active").length,
      completed: completions.filter((e) => e.category === category).length,
      xp: completions
        .filter((e) => e.category === category)
        .reduce((sum, e) => sum + (e.xp_earned ?? 0), 0),
    }));
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const end = now - (11 - i) * 7 * 86400000;
    const start = end - 7 * 86400000;
    const items = completions.filter(
      (e) => Date.parse(e.occurred_at) >= start && Date.parse(e.occurred_at) < end,
    );
    return {
      week: new Date(start).toISOString().slice(0, 10),
      completed: items.length,
      xp: items.reduce((s, e) => s + (e.xp_earned ?? 0), 0),
    };
  });
  return {
    categories,
    weeks,
    last7: since(7).length,
    last30: since(30).length,
    previous7: since(14).length - since(7).length,
    active: quests.filter((q) => q.status === "active").length,
    plannedMinutes: quests
      .filter((q) => q.status === "active")
      .reduce((s, q) => s + (q.estimated_duration ?? 30), 0),
  };
}
export function simulate(effortHours: number, weeklyHours: number) {
  return [0.6, 0.8, 1].map((adherence) => ({
    adherence,
    hoursPerWeek: weeklyHours * adherence,
    weeks: Math.ceil(effortHours / (weeklyHours * adherence)),
  }));
}
export function planDay(
  quests: MetricQuest[],
  date: string,
  startHour: number,
  availableMinutes: number,
) {
  const selected: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    minutes: number;
    version: string;
  }[] = [];
  let cursor = startHour * 60;
  const end = Math.min(1440, cursor + availableMinutes);
  const busy = quests
    .filter((q) => q.status === "active" && q.scheduled_for === date && q.start_time)
    .map((q) => {
      const [h, m] = q.start_time!.split(":").map(Number);
      return { start: h * 60 + m, end: h * 60 + m + (q.estimated_duration ?? 30) };
    });
  for (const q of quests
    .filter(
      (q) =>
        q.status === "active" && (!q.scheduled_for || (q.scheduled_for === date && !q.start_time)),
    )
    .sort(
      (a, b) =>
        (a.type === "main" ? -1 : 1) - (b.type === "main" ? -1 : 1) ||
        a.title.localeCompare(b.title),
    )) {
    const duration = Math.max(5, q.estimated_duration ?? 30);
    for (const slot of [...busy].sort((a, b) => a.start - b.start)) {
      if (cursor < slot.end && cursor + duration > slot.start) cursor = slot.end;
    }
    if (cursor + duration > end) continue;
    selected.push({
      id: q.id,
      title: q.title,
      date,
      startTime: `${Math.floor(cursor / 60)
        .toString()
        .padStart(2, "0")}:${(cursor % 60).toString().padStart(2, "0")}`,
      minutes: duration,
      version: q.updated_at,
    });
    cursor += duration + 5;
    if (selected.length >= 20) break;
  }
  return selected;
}
