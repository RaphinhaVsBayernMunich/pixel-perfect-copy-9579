import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { useUI } from "@/lib/ui-store";
import { useQuests } from "@/lib/quests-store";
import { conflictIds, toISODate } from "@/lib/calendar-utils";
import {
  AgendaView,
  DayView,
  MonthView,
  WeekView,
} from "@/components/calendar/calendar-views";
import { QuestBlock } from "@/components/calendar/quest-block";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — QuestOS" },
      {
        name: "description",
        content:
          "Plan your week, block focus sessions, and let the AI balance your workload.",
      },
      { property: "og:title", content: "Calendar — QuestOS" },
      {
        property: "og:description",
        content: "Smart scheduling that adapts when life changes.",
      },
    ],
  }),
  component: CalendarPage,
});

type ViewKey = "day" | "week" | "month" | "agenda";

const VIEWS: { value: ViewKey; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "agenda", label: "Agenda" },
];

function CalendarPage() {
  const [view, setView] = useState<ViewKey>("week");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const quests = useQuests((s) => s.quests);
  const update = useQuests((s) => s.update);

  const conflicts = useMemo(() => conflictIds(quests), [quests]);
  const unscheduled = useMemo(
    () => quests.filter((q) => !q.scheduledFor && !q.completed),
    [quests],
  );

  function shift(dir: -1 | 1) {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week" || view === "agenda")
      d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  }

  const label = useMemo(() => {
    if (view === "day")
      return anchor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    if (view === "month")
      return anchor.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    // week / agenda
    const start = new Date(anchor);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + (view === "agenda" ? 13 : 6));
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} — ${fmt(end)}`;
  }, [anchor, view]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pt-8 pb-8 md:px-10 md:pt-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Chapter 5
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Calendar
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Drag quests onto any day or hour to schedule. Conflicts glow red.
          </p>
        </div>
        <button
          onClick={openQuickAdd}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New quest
        </button>
      </header>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-card/40 text-muted-foreground transition hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-lg border border-hairline bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Today
          </button>
          <button
            onClick={() => shift(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-card/40 text-muted-foreground transition hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="ml-2 font-display text-base font-semibold">{label}</p>
        </div>

        <div className="flex gap-1 rounded-full border border-hairline bg-card/40 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                view === v.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {view === "day" ? (
            <DayView anchor={anchor} />
          ) : view === "week" ? (
            <WeekView anchor={anchor} />
          ) : view === "month" ? (
            <MonthView anchor={anchor} />
          ) : (
            <AgendaView anchor={anchor} />
          )}
        </div>

        {/* Unscheduled tray */}
        <aside
          className="rounded-2xl border border-hairline bg-card/30 p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/quest");
            if (id)
              update(id, { scheduledFor: undefined, startTime: undefined });
          }}
        >
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Backlog
              </p>
              <h2 className="mt-1 font-display text-sm font-semibold">
                Unscheduled
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {unscheduled.length}
            </span>
          </div>
          {unscheduled.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {unscheduled.map((q) => (
                <QuestBlock
                  key={q.id}
                  quest={q}
                  conflict={conflicts.has(q.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-hairline p-4 text-center">
              <CalendarDays className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                Drop a scheduled quest here to un-plan it.
              </p>
            </div>
          )}
          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            Drop onto a day or hour to schedule.
            <br />
            Drop back here to unschedule.
          </p>
        </aside>
      </div>

      {/* Today mini-preview when far away */}
      {toISODate(anchor) !== toISODate(new Date()) ? (
        <button
          onClick={() => setAnchor(new Date())}
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary backdrop-blur md:bottom-8"
        >
          Jump to today
        </button>
      ) : null}
    </div>
  );
}
