import { useState } from "react";
import { Health } from "@capgo/capacitor-health";
import { isNative } from "@/lib/native/platform";
import { QuestOSNative, type DeviceEvent } from "@/lib/premium/native";
import { useAuth } from "@/lib/auth-store";
import { usePremiumData, useRefreshPremium } from "@/lib/premium/hooks";
import { savePremiumData, applyCalendarChanges } from "@/lib/premium/premium.functions";
import { healthRecord } from "@/lib/premium/contracts";
import { useQuests } from "@/lib/quests-store";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { z } from "zod";
export function NativeWidgets() {
  return isNative() ? (
    <Button
      variant="outline"
      onClick={() =>
        void QuestOSNative.pinWidget().catch(() =>
          toast.error(
            "Your launcher could not add this widget. Add QuestOS from the launcher widget picker.",
          ),
        )
      }
    >
      Add upcoming quests to launcher
    </Button>
  ) : null;
}
export function NativeHealth() {
  const [rows, setRows] = useState<z.infer<typeof healthRecord>[] | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useRefreshPremium();
  const userId = useAuth((s) => s.user?.id);
  if (!isNative())
    return (
      <p className="text-xs">
        Health Connect is available in the Android app. CSV import works here.
      </p>
    );
  const read = async () => {
    setBusy(true);
    try {
      if (!(await Health.isAvailable()).available)
        throw new Error("Install or enable Health Connect on this device.");
      const permission = await Health.requestAuthorization({
        read: ["steps", "sleep", "workouts"],
        write: [],
      });
      if (
        !["steps", "sleep", "workouts"].every((p) =>
          permission.readAuthorized.includes(p as "steps"),
        )
      )
        throw new Error("Allow steps, sleep and exercise access to import a complete summary.");
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      const base = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        bucket: "day" as const,
        aggregation: "sum" as const,
      };
      const steps = await Health.queryAggregated({ ...base, dataType: "steps" });
      const sleep = await Health.queryAggregated({ ...base, dataType: "sleep" });
      const workouts = await Health.queryWorkouts({
        startDate: base.startDate,
        endDate: base.endDate,
        limit: 1000,
      });
      if (workouts.anchor)
        throw new Error("Too many workouts for one import. Use a daily CSV export instead.");
      const byDate = new Map<string, z.infer<typeof healthRecord>>();
      const day = (stamp: string) => {
        const date = new Date(stamp).toLocaleDateString("en-CA");
        let row = byDate.get(date);
        if (!row) {
          row = { date, steps: 0, sleepMinutes: 0, workoutMinutes: 0 };
          byDate.set(date, row);
        }
        return row;
      };
      for (const s of steps.samples) day(s.startDate).steps += Math.round(s.value);
      for (const s of sleep.samples) day(s.startDate).sleepMinutes += Math.round(s.value);
      for (const w of workouts.workouts)
        day(w.startDate).workoutMinutes += Math.round(w.duration / 60);
      const parsed = z
        .array(healthRecord)
        .max(366)
        .parse([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
      if (useAuth.getState().user?.id === userId) setRows(parsed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Health Connect failed");
    } finally {
      if (useAuth.getState().user?.id === userId) setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs">
        Read the last 30 days from Health Connect. Review before saving daily steps, sleep and
        workout minutes to your QuestOS account. Raw health samples stay on this device.
      </p>
      <Button disabled={busy} onClick={() => void read()}>
        Read Health Connect
      </Button>
      {rows && (
        <>
          <p>
            {rows.length} days ready · {rows.reduce((s, r) => s + r.steps, 0)} steps ·{" "}
            {rows.reduce((s, r) => s + r.sleepMinutes, 0)} sleep minutes ·{" "}
            {rows.reduce((s, r) => s + r.workoutMinutes, 0)} workout minutes
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void savePremiumData({
                data: { kind: "health", value: { source: "health-connect", records: rows } },
              })
                .then(async () => {
                  if (useAuth.getState().user?.id !== userId) return;
                  setRows(null);
                  await refresh();
                  toast.success("Daily health summary saved.");
                })
                .catch(() => toast.error("Health summary was not saved. Retry."))
                .finally(() => setBusy(false));
            }}
          >
            Save this summary to my account
          </Button>
          <Button variant="ghost" onClick={() => setRows(null)}>
            Discard preview
          </Button>
        </>
      )}
    </div>
  );
}
export function NativeCalendar() {
  const { data } = usePremiumData();
  const refresh = useRefreshPremium();
  const userId = useAuth((s) => s.user?.id);
  const [calendars, setCalendars] = useState<{ id: string; name: string }[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [events, setEvents] = useState<DeviceEvent[] | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isNative())
    return (
      <p className="text-xs">
        Device calendar sync is available on Android. Use event-file import/export on the web.
      </p>
    );
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Calendar operation failed");
    } finally {
      if (useAuth.getState().user?.id === userId) setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs">
        Connect a writable calendar already synced on your device. QuestOS only updates events it
        created for this account. Review changes before syncing in either direction.
      </p>
      <Button
        disabled={busy}
        onClick={() =>
          void act(async () => {
            const list = await QuestOSNative.calendars();
            if (useAuth.getState().user?.id === userId) setCalendars(list.calendars);
          })
        }
      >
        Choose a device calendar
      </Button>
      {calendars.length > 0 && (
        <select
          aria-label="Device calendar"
          value={calendarId}
          onChange={(e) => {
            setCalendarId(e.target.value);
            setEvents(null);
          }}
        >
          <option value="">Select calendar</option>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {calendarId && (
        <>
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const list = await QuestOSNative.readCalendar({
                  calendarId,
                  userId: userId!,
                  start: new Date(Date.now() - 7 * 86400000).toISOString(),
                  end: new Date(Date.now() + 90 * 86400000).toISOString(),
                });
                if (useAuth.getState().user?.id === userId) setEvents(list.events);
              })
            }
          >
            Preview next 90 days
          </Button>
          <Button
            disabled={busy || !data}
            onClick={() =>
              void act(async () => {
                const outgoing = (data?.quests ?? [])
                  .filter((q) => q.status === "active" && q.scheduled_for && q.start_time)
                  .map((q) => {
                    const start = new Date(`${q.scheduled_for}T${q.start_time}`);
                    return {
                      id: q.id,
                      questId: q.id,
                      title: q.title,
                      start: start.toISOString(),
                      end: new Date(
                        start.getTime() + (q.estimated_duration ?? 30) * 60000,
                      ).toISOString(),
                    };
                  });
                if (outgoing.length > 300)
                  throw new Error("Sync at most 300 scheduled quests at a time.");
                await QuestOSNative.writeCalendar({
                  calendarId,
                  userId: userId!,
                  events: outgoing,
                });
                toast.success(
                  `${outgoing.length} scheduled quests sent to the selected calendar. Existing unrelated events were preserved.`,
                );
              })
            }
          >
            Confirm: send scheduled quests to this calendar
          </Button>
        </>
      )}
      {events && (
        <>
          <ul className="text-xs">
            {events.map((e) => (
              <li key={e.id}>
                {e.title} · {new Date(e.start).toLocaleString()}
                {e.questId ? " · linked quest" : ""}
              </li>
            ))}
          </ul>
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await savePremiumData({
                  data: { kind: "calendar", value: { calendarId, records: events } },
                });
                if (useAuth.getState().user?.id !== userId) return;
                await refresh();
                toast.success("Calendar preview saved to your account.");
              })
            }
          >
            Save these calendar events to my account
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const changes = events
                  .filter((e) => e.questId)
                  .map((e) => {
                    const quest = data?.quests.find((q) => q.id === e.questId);
                    if (!quest) throw new Error("Refresh quest data before applying changes.");
                    const date = new Date(e.start);
                    const scheduledFor = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    return {
                      id: quest.id,
                      version: quest.updated_at,
                      title: e.title,
                      date: scheduledFor,
                      startTime: date.toTimeString().slice(0, 5),
                      minutes: Math.round((Date.parse(e.end) - Date.parse(e.start)) / 60000),
                    };
                  });
                await applyCalendarChanges({ data: { changes, confirm: true } });
                if (useAuth.getState().user?.id !== userId) return;
                for (const c of changes)
                  useQuests.getState().update(c.id, {
                    title: c.title,
                    scheduledFor: c.date,
                    startTime: c.startTime,
                    estimatedMinutes: c.minutes,
                  });
                await refresh();
                toast.success("Linked quests updated from calendar.");
              })
            }
          >
            Confirm: apply linked calendar edits to my quests
          </Button>
        </>
      )}
    </div>
  );
}
