import { useEffect, useRef, useState } from "react";
import { usePremiumData, useRefreshPremium } from "@/lib/premium/hooks";
import {
  savePremiumData,
  runPremiumCoach,
  confirmAssistantPlan,
} from "@/lib/premium/premium.functions";
import { startAmbient } from "@/lib/premium/audio";
import {
  downloadText,
  healthCsv,
  calendarIcs,
  parseCalendarIcs,
} from "@/lib/premium/import-export";
import { premiumWrite } from "@/lib/premium/contracts";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PremiumGate } from "./subscription/premium-gate";
import { useAuth } from "@/lib/auth-store";
import { usePremium } from "@/lib/subscription/service";
import { useQuests } from "@/lib/quests-store";
import { PREMIUM_FEATURES, type PremiumFeature } from "@/lib/subscription/types";
import { toast } from "sonner";
import type { ReactNode } from "react";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-hairline bg-card/70 p-5">
      <h2 className="font-display text-xl">{title}</h2>
      {children}
    </section>
  );
}
const field = "rounded-lg border border-input bg-background px-3 py-2 w-full";
export function PremiumWorkspace() {
  const enabled = usePremium("analytics.advanced");
  const { data, error, isFetching } = usePremiumData();
  const refresh = useRefreshPremium();
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [goal, setGoal] = useState("");
  const [hours, setHours] = useState(5);
  const [effort, setEffort] = useState(100);
  const [years, setYears] = useState<1 | 5 | 10>(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(9);
  const [minutes, setMinutes] = useState(120);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runPremiumCoach>> | null>(null);
  const [experimentName, setExperimentName] = useState("");
  const [focusEnd, setFocusEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const stopAudio = useRef<(() => void) | null>(null);
  const userId = useAuth((s) => s.user?.id);
  useEffect(() => {
    if (data) {
      setFacts(data.memory.facts.join("\n"));
      setMemoryEnabled(data.memory.enabled);
    }
  }, [data]);
  useEffect(
    () => () => {
      stopAudio.current?.();
    },
    [userId],
  );
  useEffect(() => {
    if (!enabled) {
      stopAudio.current?.();
      stopAudio.current = null;
    }
  }, [enabled]);
  useEffect(() => {
    if (!focusEnd) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((focusEnd - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) {
        setFocusEnd(null);
        toast.success("Focus session complete.");
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [focusEnd]);
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      if (useAuth.getState().user?.id === userId)
        toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      if (useAuth.getState().user?.id === userId) setBusy(false);
    }
  };
  const save = (input: z.infer<typeof premiumWrite>) =>
    act(async () => {
      await savePremiumData({ data: input });
      if (useAuth.getState().user?.id !== userId) return;
      await refresh();
      toast.success("Saved");
    });
  const coach = (feature: "future_me" | "goal_simulator" | "executive_assistant") =>
    act(async () => {
      const input =
        feature === "future_me"
          ? { feature, goal, weeklyHours: hours, years }
          : feature === "goal_simulator"
            ? { feature, goal, weeklyHours: hours, effortHours: effort }
            : { feature, date, startHour, availableMinutes: minutes };
      const next = await runPremiumCoach({ data: input });
      if (useAuth.getState().user?.id === userId) setResult(next);
    });
  if (!enabled)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Object.keys(PREMIUM_FEATURES)
          .filter((k) => k !== "ai.unlimited")
          .map((key) => (
            <PremiumGate key={key} feature={key as PremiumFeature}>
              <span />
            </PremiumGate>
          ))}
      </div>
    );
  if (!data)
    return (
      <p role={error ? "alert" : undefined}>
        {error
          ? "Premium data could not load. Check your subscription and retry."
          : "Loading your workspace…"}{" "}
        <Button onClick={() => void refresh()}>Retry</Button>
      </p>
    );
  const documents = JSON.parse(data.documentsJson) as Record<string, unknown>;
  const health = premiumWrite.options[2].shape.value.safeParse(documents.health);
  const calendar = premiumWrite.options[3].shape.value.safeParse(documents.calendar);
  const experiment = premiumWrite.options[4].shape.value.safeParse(documents.experiment);
  const healthRows = health.success ? health.data.records : [];
  const calendarRows = calendar.success ? calendar.data.records : [];
  const evidence = result
    ? (JSON.parse(result.evidenceJson) as {
        actions?: { id: string; title: string; date: string; startTime: string; minutes: number }[];
        scenarios?: { adherence: number; hoursPerWeek: number; weeks: number }[];
        practiceHours?: { adherence: number; hours: number }[];
      })
    : null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Uses your synced quests and history. Refresh after syncing edits.
        </p>
        <Button variant="outline" disabled={isFetching} onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="AI Memory">
          <p className="text-sm">
            With your permission, Coach uses these facts and your latest 20 completions in future
            requests. Edit or clear them anytime.
          </p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => setMemoryEnabled(e.target.checked)}
            />
            Use memory in AI Coach
          </label>
          <textarea
            aria-label="Memory facts, one per line"
            className={field}
            rows={5}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
          />
          <Button
            disabled={busy}
            onClick={() =>
              void save({
                kind: "memory",
                value: {
                  enabled: memoryEnabled,
                  facts: facts
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
          >
            Save memory
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void save({ kind: "memory", value: { enabled: false, facts: [] } })}
          >
            Clear memory
          </Button>
        </Panel>
        <Panel title="Future Me & Goal Simulator">
          <label>
            Goal
            <input className={field} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </label>
          <label>
            Hours per week
            <input
              className={field}
              type="number"
              min={1}
              max={80}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </label>
          <label>
            Future horizon
            <select
              className={field}
              value={years}
              onChange={(e) => setYears(Number(e.target.value) as 1 | 5 | 10)}
            >
              <option value={1}>1 year</option>
              <option value={5}>5 years</option>
              <option value={10}>10 years</option>
            </select>
          </label>
          <Button disabled={busy || goal.trim().length < 3} onClick={() => void coach("future_me")}>
            Explore Future Me
          </Button>
          <label className="block">
            Estimated total effort (hours)
            <input
              className={field}
              type="number"
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
            />
          </label>
          <Button
            disabled={busy || goal.trim().length < 3}
            onClick={() => void coach("goal_simulator")}
          >
            Compare goal scenarios
          </Button>
          <p className="text-xs">
            Scenarios use 60%, 80% and 100% adherence. Estimates are not guarantees.
          </p>
        </Panel>
        <Panel title="AI Executive Assistant">
          <p className="text-sm">
            Propose a day from your actual unscheduled active quests. Existing time blocks are
            respected. Nothing changes until you confirm.
          </p>
          <label>
            Date
            <input
              type="date"
              className={field}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Start hour (0–23)
            <input
              type="number"
              className={field}
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            />
          </label>
          <label>
            Available minutes
            <input
              type="number"
              className={field}
              min={15}
              max={720}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <Button disabled={busy} onClick={() => void coach("executive_assistant")}>
            Propose a schedule
          </Button>
        </Panel>
        <Panel title="Advanced Analytics">
          <p>
            {data.metrics.last7} completions this week versus {data.metrics.previous7} in the
            previous week. {data.metrics.last30} in 30 days.
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Category</th>
                <th>Active</th>
                <th>Completed</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.categories.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.active}</td>
                  <td>{c.completed}</td>
                  <td>{c.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs">Completion/XP totals use the last 366 days of recorded events.</p>
          <div className="flex h-24 items-end gap-1" aria-label="12-week completion trend">
            {data.metrics.weeks.map((w) => (
              <div
                key={w.week}
                className="flex-1 bg-primary/60"
                title={`${w.week}: ${w.completed} completions`}
                style={{
                  height: `${Math.max(3, (w.completed / Math.max(1, ...data.metrics.weeks.map((v) => v.completed))) * 100)}%`,
                }}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() =>
              void downloadText(
                "questos-analytics.csv",
                "week,completed,xp\n" +
                  data.metrics.weeks.map((w) => `${w.week},${w.completed},${w.xp}`).join("\n"),
                "text/csv",
              ).catch(() => {})
            }
          >
            Export weekly analytics
          </Button>
        </Panel>
        <Panel title="Premium Themes">
          <p>Apply an account-synced palette throughout QuestOS.</p>
          <div className="flex flex-wrap gap-2">
            {(["default", "aurora", "ocean", "ember"] as const).map((theme) => (
              <Button
                key={theme}
                variant={data.preferences.theme === theme ? "default" : "outline"}
                disabled={busy}
                onClick={() =>
                  void save({ kind: "preferences", value: { ...data.preferences, theme } })
                }
              >
                {theme}
              </Button>
            ))}
          </div>
        </Panel>
        <Panel title="Premium Sound Packs">
          <p className="text-sm">
            Original ambient rain, forest and space audio for focus. Playback starts only when you
            choose Play.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["rain", "forest", "space"] as const).map((sound) => (
              <Button
                key={sound}
                onClick={() => {
                  stopAudio.current?.();
                  stopAudio.current = startAmbient(sound);
                  void save({ kind: "preferences", value: { ...data.preferences, sound } });
                }}
              >
                Play {sound}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                stopAudio.current?.();
                stopAudio.current = null;
              }}
            >
              Stop
            </Button>
          </div>
        </Panel>
        <Panel title="Premium Widgets">
          <p>
            Focus timer and upcoming quests are available in-app. Android also supports a launcher
            widget after native setup.
          </p>
          <p className="font-mono text-2xl">
            {focusEnd
              ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : "25:00"}
          </p>
          <Button onClick={() => setFocusEnd(Date.now() + 25 * 60000)}>
            Start 25-minute focus
          </Button>
          <Button variant="outline" onClick={() => setFocusEnd(null)}>
            Reset
          </Button>
          <NativeWidgets />
        </Panel>
        <Panel title="Advanced Dashboard Widgets">
          <p>Select which live panels appear on Home.</p>
          {(["focus", "category", "week", "forecast"] as const).map((widget) => (
            <label key={widget} className="mr-4 inline-flex gap-2">
              <input
                type="checkbox"
                checked={data.preferences.widgets.includes(widget)}
                onChange={(e) =>
                  void save({
                    kind: "preferences",
                    value: {
                      ...data.preferences,
                      widgets: e.target.checked
                        ? [...data.preferences.widgets, widget]
                        : data.preferences.widgets.filter((w) => w !== widget),
                    },
                  })
                }
              />
              {widget}
            </label>
          ))}
        </Panel>
        <Panel title="Calendar Integrations">
          <p className="text-sm">
            Exchange UTC event files with Google, Apple or Outlook. Android can read and update
            calendars configured on the device.
          </p>
          <Button
            onClick={() =>
              void downloadText("questos.ics", calendarIcs(data.quests), "text/calendar").catch(
                () => {},
              )
            }
          >
            Export scheduled quests (.ics)
          </Button>
          <label className="block">
            Import events (.ics)
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void act(async () => {
                    if (file.size > 131072) throw new Error("Calendar file must be under 128 KB");
                    await savePremiumData({
                      data: {
                        kind: "calendar",
                        value: { records: parseCalendarIcs(await file.text()), calendarId: "ics" },
                      },
                    });
                    await refresh();
                  });
              }}
            />
          </label>
          <p>{calendarRows.length} imported calendar events</p>
          <ul className="text-sm">
            {calendarRows.slice(0, 10).map((e) => (
              <li key={e.id}>
                {e.title} · {new Date(e.start).toLocaleString()}
              </li>
            ))}
          </ul>
          <NativeCalendar />
        </Panel>
        <Panel title="Health Integrations">
          <p className="text-sm">
            Import a wearable export with columns date,steps,sleepMinutes,workoutMinutes. Only these
            daily aggregates are stored.
          </p>
          <label>
            Import health CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void act(async () => {
                    if (file.size > 131072) throw new Error("Health file must be under 128 KB");
                    await savePremiumData({
                      data: {
                        kind: "health",
                        value: { records: healthCsv(await file.text()), source: "csv" },
                      },
                    });
                    await refresh();
                  });
              }}
            />
          </label>
          <p>
            {healthRows.length} recorded days ·{" "}
            {healthRows.reduce((s, r) => s + r.steps, 0).toLocaleString()} steps ·{" "}
            {healthRows.reduce((s, r) => s + r.workoutMinutes, 0)} workout minutes
          </p>
          <table className="text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Steps</th>
                <th>Sleep (min)</th>
              </tr>
            </thead>
            <tbody>
              {healthRows.slice(-7).map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.steps}</td>
                  <td>{r.sleepMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <NativeHealth />
        </Panel>
        <Panel title="Experimental Features · Focus experiment">
          <p className="text-sm">
            Run a 14-day focus experiment. Compare completed quests during your experiment against
            the previous 14 days. This is observational, not proof of causation.
          </p>
          <label>
            Experiment name
            <input
              className={field}
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
            />
          </label>
          <Button
            disabled={busy || experimentName.length < 3}
            onClick={() =>
              void save({
                kind: "experiment",
                value: {
                  name: experimentName,
                  category: "all",
                  start: new Date().toISOString().slice(0, 10),
                  days: 14,
                  dailyMinutes: 25,
                },
              })
            }
          >
            Start experiment
          </Button>
          {experiment.success && (
            <ExperimentResult experiment={experiment.data} events={data.events} />
          )}
        </Panel>
      </div>
      {result && (
        <Panel title="Coach result">
          <p>{result.narrative.summary}</p>
          <ul className="list-inside list-disc">
            {result.narrative.observations.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          {evidence?.scenarios?.map((s) => (
            <p key={s.adherence}>
              {s.adherence * 100}% adherence: {s.hoursPerWeek} h/week → {s.weeks} weeks
            </p>
          ))}
          {evidence?.practiceHours?.map((s) => (
            <p key={s.adherence}>
              {s.adherence * 100}% adherence → {s.hours} practice hours
            </p>
          ))}
          {evidence?.actions?.map((a) => (
            <p key={a.id}>
              {a.date} {a.startTime} · {a.title} ({a.minutes} min)
            </p>
          ))}
          <h3>Next steps</h3>
          <ol className="list-inside list-decimal">
            {result.narrative.nextSteps.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          {result.proposalId && (
            <Button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await confirmAssistantPlan({
                    data: { proposalId: result.proposalId!, confirm: true },
                  });
                  if (useAuth.getState().user?.id !== userId) return;
                  for (const a of evidence?.actions ?? [])
                    useQuests
                      .getState()
                      .update(a.id, { scheduledFor: a.date, startTime: a.startTime });
                  setResult(null);
                  await refresh();
                  toast.success("Confirmed schedule applied.");
                })
              }
            >
              Confirm and apply this schedule
            </Button>
          )}
          <Button variant="ghost" onClick={() => setResult(null)}>
            Dismiss
          </Button>
        </Panel>
      )}
    </div>
  );
}
function ExperimentResult({
  experiment,
  events,
}: {
  experiment: { name: string; start: string; days: number };
  events: { kind: string; occurred_at: string }[];
}) {
  const start = Date.parse(experiment.start);
  const period = experiment.days * 86400000;
  const count = (a: number, b: number) =>
    events.filter(
      (e) =>
        e.kind === "completion" && Date.parse(e.occurred_at) >= a && Date.parse(e.occurred_at) < b,
    ).length;
  return (
    <p>
      {experiment.name}: {count(start - period, start)} baseline completions /{" "}
      {count(start, start + period)} experiment completions so far. Started {experiment.start}.
    </p>
  );
}
// Native components provide actual plugin operations, with unsupported-device errors shown explicitly.
import { NativeCalendar, NativeHealth, NativeWidgets } from "./premium-native";
