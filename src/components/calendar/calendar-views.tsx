import { useMemo, useState } from "react";
import { useQuests, type Quest } from "@/lib/quests-store";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_PX,
  blockGeometry,
  conflictIds,
  fmtTime,
  isToday,
  parseTime,
  questsOnDate,
  toISODate,
  yToStartTime,
} from "@/lib/calendar-utils";
import { QuestBlock } from "./quest-block";
import { cn } from "@/lib/utils";

const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i,
);

interface DayColumnProps {
  date: Date;
  quests: Quest[];
  conflicts: Set<string>;
  onDrop: (questId: string, iso: string, startTime: string) => void;
  showHeader?: boolean;
}

export function DayColumn({
  date,
  quests,
  conflicts,
  onDrop,
  showHeader = true,
}: DayColumnProps) {
  const iso = toISODate(date);
  const dayQuests = useMemo(
    () => questsOnDate(quests, iso).filter((q) => q.startTime),
    [quests, iso],
  );
  const untimed = useMemo(
    () => questsOnDate(quests, iso).filter((q) => !q.startTime),
    [quests, iso],
  );
  const [hoverY, setHoverY] = useState<number | null>(null);
  const today = isToday(date);

  const nowLine = today ? nowOffset() : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {showHeader ? (
        <div
          className={cn(
            "sticky top-0 z-10 border-b border-hairline bg-background/85 px-2 py-2 text-center backdrop-blur",
            today && "bg-primary/5",
          )}
        >
          <p className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            {date.toLocaleDateString(undefined, { weekday: "short" })}
          </p>
          <p
            className={cn(
              "font-display text-lg font-semibold",
              today && "text-primary",
            )}
          >
            {date.getDate()}
          </p>
        </div>
      ) : null}

      {untimed.length > 0 ? (
        <div className="flex flex-col gap-1 border-b border-hairline bg-card/30 p-1">
          {untimed.map((q) => (
            <QuestBlock
              key={q.id}
              quest={q}
              compact
              conflict={conflicts.has(q.id)}
            />
          ))}
        </div>
      ) : null}

      <div
        className="relative flex-1 select-none"
        onDragOver={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          setHoverY(e.clientY - rect.top);
        }}
        onDragLeave={() => setHoverY(null)}
        onDrop={(e) => {
          e.preventDefault();
          const questId = e.dataTransfer.getData("text/quest");
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          setHoverY(null);
          if (questId) onDrop(questId, iso, yToStartTime(y));
        }}
        style={{ height: HOURS.length * HOUR_PX }}
      >
        {HOURS.map((h, i) => (
          <div
            key={h}
            className="absolute right-0 left-0 border-t border-hairline/60"
            style={{ top: i * HOUR_PX, height: HOUR_PX }}
          />
        ))}

        {hoverY !== null ? (
          <div
            className="pointer-events-none absolute right-0 left-0 border-t-2 border-primary/70"
            style={{ top: Math.max(0, hoverY) }}
          >
            <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              {fmtTime(yToStartTime(hoverY))}
            </span>
          </div>
        ) : null}

        {nowLine !== null && nowLine >= 0 && nowLine <= HOURS.length * HOUR_PX ? (
          <div
            className="pointer-events-none absolute right-0 left-0 z-20 border-t border-boss"
            style={{ top: nowLine }}
          >
            <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-boss" />
          </div>
        ) : null}

        <div className="absolute inset-0">
          {dayQuests.map((q) => {
            const geom = blockGeometry(q.startTime!, q.estimatedMinutes);
            return (
              <div
                key={q.id}
                className="absolute right-1 left-1"
                style={{ top: geom.top, height: geom.height }}
              >
                <QuestBlock
                  quest={q}
                  conflict={conflicts.has(q.id)}
                  className="h-full"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function nowOffset() {
  const d = new Date();
  const min = d.getHours() * 60 + d.getMinutes();
  const anchor = DAY_START_HOUR * 60;
  return ((min - anchor) / 60) * HOUR_PX;
}

export function TimeAxis() {
  return (
    <div className="w-14 shrink-0 pt-[52px]">
      <div className="relative" style={{ height: HOURS.length * HOUR_PX }}>
        {HOURS.map((h, i) => (
          <div
            key={h}
            className="absolute right-1 -translate-y-1/2 text-[10px] font-medium tracking-wide text-muted-foreground"
            style={{ top: i * HOUR_PX }}
          >
            {formatHour(h)}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatHour(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12} ${ampm}`;
}

/* -------------------- Views -------------------- */

interface ViewProps {
  anchor: Date;
}

export function DayView({ anchor }: ViewProps) {
  const quests = useQuests((s) => s.quests);
  const update = useQuests((s) => s.update);
  const conflicts = useMemo(() => conflictIds(quests), [quests]);

  return (
    <div className="flex overflow-x-auto rounded-2xl border border-hairline bg-card/30">
      <TimeAxis />
      <DayColumn
        date={anchor}
        quests={quests}
        conflicts={conflicts}
        onDrop={(id, iso, t) =>
          update(id, { scheduledFor: iso, startTime: t })
        }
      />
    </div>
  );
}

export function WeekView({ anchor }: ViewProps) {
  const quests = useQuests((s) => s.quests);
  const update = useQuests((s) => s.update);
  const conflicts = useMemo(() => conflictIds(quests), [quests]);
  const days = useMemo(() => {
    const start = new Date(anchor);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [anchor]);

  return (
    <div className="flex overflow-x-auto rounded-2xl border border-hairline bg-card/30">
      <TimeAxis />
      <div className="grid min-w-0 flex-1 grid-cols-7 divide-x divide-hairline">
        {days.map((d) => (
          <DayColumn
            key={d.toISOString()}
            date={d}
            quests={quests}
            conflicts={conflicts}
            onDrop={(id, iso, t) =>
              update(id, { scheduledFor: iso, startTime: t })
            }
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Month -------------------- */

export function MonthView({ anchor }: ViewProps) {
  const quests = useQuests((s) => s.quests);
  const update = useQuests((s) => s.update);

  const cells = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const day = first.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(first);
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [anchor]);

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-card/30">
      <div className="grid grid-cols-7 border-b border-hairline bg-background/40">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[10px] tracking-[0.15em] text-muted-foreground uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((d) => {
          const iso = toISODate(d);
          const items = questsOnDate(quests, iso);
          const outside = d.getMonth() !== anchor.getMonth();
          const today = isToday(d);
          return (
            <div
              key={iso}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/quest");
                if (id) update(id, { scheduledFor: iso });
              }}
              className={cn(
                "min-h-[110px] border-t border-l border-hairline/60 p-1.5",
                outside && "opacity-40",
                today && "bg-primary/5",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    today && "font-display font-semibold text-primary",
                  )}
                >
                  {d.getDate()}
                </span>
                {items.length > 3 ? (
                  <span className="text-[9px] text-muted-foreground">
                    +{items.length - 3}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((q) => (
                  <QuestBlock key={q.id} quest={q} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- Agenda -------------------- */

export function AgendaView({ anchor }: ViewProps) {
  const quests = useQuests((s) => s.quests);
  const days = useMemo(() => {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [anchor]);

  return (
    <div className="space-y-4">
      {days.map((d) => {
        const iso = toISODate(d);
        const items = questsOnDate(quests, iso);
        if (items.length === 0) return null;
        const today = isToday(d);
        return (
          <section
            key={iso}
            className="overflow-hidden rounded-2xl border border-hairline bg-card/30"
          >
            <header
              className={cn(
                "flex items-baseline justify-between border-b border-hairline px-4 py-2",
                today && "bg-primary/5",
              )}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className={cn(
                    "font-display text-lg font-semibold",
                    today && "text-primary",
                  )}
                >
                  {d.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {today ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase">
                    Today
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {items.length} quest{items.length === 1 ? "" : "s"}
              </span>
            </header>
            <ul className="divide-y divide-hairline/60">
              {items.map((q) => (
                <li key={q.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                    {q.startTime ? fmtTime(q.startTime) : "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <QuestBlock quest={q} compact />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// re-export parseTime for potential consumers
export { parseTime };
