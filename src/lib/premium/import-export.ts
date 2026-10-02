import { isNative } from "../native/platform";
import { toast } from "sonner";
import { z } from "zod";
import { healthRecord, calendarRecord, type MetricQuest } from "./contracts";
export function healthCsv(text: string) {
  if (text.length > 131072) throw new Error("Health file must be under 128 KB.");
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (header.trim() !== "date,steps,sleepMinutes,workoutMinutes")
    throw new Error("Expected columns: date,steps,sleepMinutes,workoutMinutes");
  return z
    .array(healthRecord)
    .max(366)
    .parse(
      lines.filter(Boolean).map((line) => {
        const [date, steps, sleepMinutes, workoutMinutes] = line.split(",");
        return {
          date,
          steps: Number(steps),
          sleepMinutes: Number(sleepMinutes),
          workoutMinutes: Number(workoutMinutes),
        };
      }),
    );
}
const escape = (s: string) =>
  s
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
const stamp = (s: string) =>
  s
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
export function calendarIcs(quests: MetricQuest[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QuestOS//Calendar//EN"];
  for (const q of quests.filter((q) => q.scheduled_for && q.status === "active")) {
    const start = new Date(`${q.scheduled_for}T${q.start_time?.slice(0, 5) ?? "09:00"}:00`);
    const end = new Date(start.getTime() + (q.estimated_duration ?? 30) * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${q.id}@questos`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(start.toISOString())}`,
      `DTEND:${stamp(end.toISOString())}`,
      `SUMMARY:${escape(q.title)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
export function parseCalendarIcs(text: string) {
  if (text.length > 131072) throw new Error("Calendar file must be under 128 KB.");
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const rows = [];
  for (const block of unfolded.split(/(?:^|\r?\n)BEGIN:VEVENT(?:\r?\n)/).slice(1)) {
    if (/(?:^|\n)RRULE[:;]/.test(block))
      throw new Error("Recurring events must be expanded by your calendar before import.");
    const field = (name: string) =>
      new RegExp(`(?:^|\\n)${name}(?:;[^:]*)?:([^\\r\\n]+)`).exec(block)?.[1];
    const date = (value: string | undefined) => {
      if (!value || !/^\d{8}T\d{6}Z$/.test(value))
        throw new Error("Export events as UTC timed events (ending in Z).");
      return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
    };
    rows.push({
      id: field("UID") ?? crypto.randomUUID(),
      title: (field("SUMMARY") ?? "Calendar event")
        .replace(/\\n/g, " ")
        .replace(/\\([,;\\])/g, "$1"),
      start: date(field("DTSTART")),
      end: date(field("DTEND")),
    });
  }
  return z.array(calendarRecord).max(300).parse(rows);
}
export async function downloadText(name: string, value: string, type = "text/plain") {
  if (isNative()) {
    try {
      const { QuestOSNative } = await import("./native");
      await QuestOSNative.shareText({ name, value, type });
    } catch {
      toast.error("Export could not open. Please retry.");
      throw new Error("Export failed");
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
