import type { Quest } from "./quests-store";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD in the user's local timezone. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Monday-based start of week. */
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(c, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Build 6×7 grid covering a full month, padded with siblings. */
export function monthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function parseTime(t?: string): { h: number; m: number } | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return { h, m: m || 0 };
}

export function fmtTime(t?: string): string {
  const p = parseTime(t);
  if (!p) return "";
  const ampm = p.h >= 12 ? "PM" : "AM";
  const h12 = p.h % 12 || 12;
  return p.m ? `${h12}:${String(p.m).padStart(2, "0")} ${ampm}` : `${h12} ${ampm}`;
}

/** Sort scheduled quests by startTime (unscheduled last). */
export function byTime(a: Quest, b: Quest): number {
  const at = parseTime(a.startTime);
  const bt = parseTime(b.startTime);
  if (!at && !bt) return 0;
  if (!at) return 1;
  if (!bt) return -1;
  return at.h * 60 + at.m - (bt.h * 60 + bt.m);
}

export function questsOnDate(quests: Quest[], iso: string): Quest[] {
  return quests.filter((q) => q.scheduledFor === iso).sort(byTime);
}

/** Detect overlapping time-blocks on same date. Returns Set of quest IDs in conflict. */
export function conflictIds(quests: Quest[]): Set<string> {
  const bad = new Set<string>();
  const byDate: Record<string, Quest[]> = {};
  for (const q of quests) {
    if (!q.scheduledFor || !q.startTime) continue;
    (byDate[q.scheduledFor] ??= []).push(q);
  }
  for (const list of Object.values(byDate)) {
    const parsed = list
      .map((q) => {
        const p = parseTime(q.startTime)!;
        const start = p.h * 60 + p.m;
        return { q, start, end: start + q.estimatedMinutes };
      })
      .sort((a, b) => a.start - b.start);
    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i].end > parsed[i + 1].start) {
        bad.add(parsed[i].q.id);
        bad.add(parsed[i + 1].q.id);
      }
    }
  }
  return bad;
}

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;
export const HOUR_PX = 56;

/** Convert a startTime + duration to a top/height in px within a day column. */
export function blockGeometry(startTime: string, minutes: number) {
  const p = parseTime(startTime)!;
  const startMin = p.h * 60 + p.m;
  const anchorMin = DAY_START_HOUR * 60;
  const top = ((startMin - anchorMin) / 60) * HOUR_PX;
  const height = Math.max(24, (minutes / 60) * HOUR_PX);
  return { top, height };
}

/** Convert a y-pixel offset in a day column back to HH:MM, snapped to 15m. */
export function yToStartTime(y: number): string {
  const totalMinutes = Math.max(0, Math.round((y / HOUR_PX) * 60));
  const snapped = Math.round(totalMinutes / 15) * 15;
  const total = DAY_START_HOUR * 60 + snapped;
  const h = Math.min(23, Math.floor(total / 60));
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
