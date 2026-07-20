import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Flame,
  Milestone,
  Plus,
  Sparkles,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import { useQuests } from "@/lib/quests-store";
import type { LegacyEvent } from "@/lib/quests-store";
import { ACHIEVEMENTS, TIER_COLOR } from "@/lib/achievements";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/legacy")({
  head: () => ({
    meta: [
      { title: "Legacy — QuestOS" },
      {
        name: "description",
        content:
          "Your timeline, milestones, achievements, and memory vault. The story you're writing.",
      },
      { property: "og:title", content: "Legacy — QuestOS" },
      {
        property: "og:description",
        content: "Timeline, achievements, and the story of you.",
      },
    ],
  }),
  component: LegacyPage,
});

type TabKey = "timeline" | "achievements" | "milestones" | "vault" | "review";

const TABS: { key: TabKey; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "achievements", label: "Achievements" },
  { key: "milestones", label: "Milestones" },
  { key: "vault", label: "Memory Vault" },
  { key: "review", label: "Monthly Review" },
];

function LegacyPage() {
  const events = useQuests((s) => s.events);
  const unlocked = useQuests((s) => s.unlockedAchievements);
  const character = useQuests((s) => s.character);
  const [tab, setTab] = useState<TabKey>("timeline");

  const stats = useMemo(() => {
    const completions = events.filter((e) => e.kind === "completion").length;
    const journals = events.filter((e) => e.kind === "journal").length;
    const milestones = events.filter(
      (e) => e.kind === "levelup" || e.kind === "achievement",
    ).length;
    return { completions, journals, milestones };
  }, [events]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-4 md:px-10 md:pt-12">
      <header className="mb-8">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Chapter 4 · Legacy
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-5xl">
          The story you're writing.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Every completed quest, level, and reflection lives here forever.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Zap className="h-4 w-4" />} label="Completions" value={stats.completions} />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Achievements" value={unlocked.length} />
          <StatCard icon={<Milestone className="h-4 w-4" />} label="Milestones" value={stats.milestones} />
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="Entries" value={stats.journals} />
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-hairline">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timeline" && <TimelineView events={events} />}
      {tab === "achievements" && <AchievementsView unlocked={unlocked} />}
      {tab === "milestones" && <MilestonesView events={events} />}
      {tab === "vault" && <VaultView events={events} />}
      {tab === "review" && <ReviewView events={events} character={character} />}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-hairline bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-primary">{icon}
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function TimelineView({ events }: { events: LegacyEvent[] }) {
  const grouped = useMemo(() => groupByDay(events), [events]);

  if (events.length === 0) {
    return <EmptyPanel title="Nothing recorded yet" body="Complete a quest to start your timeline." />;
  }

  return (
    <div className="space-y-8">
      {grouped.map(([day, list]) => (
        <section key={day}>
          <div className="mb-3 flex items-center gap-3">
            <p className="font-display text-sm font-semibold">{day}</p>
            <div className="h-px flex-1 bg-hairline" />
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
              {list.length} events
            </span>
          </div>
          <ol className="relative space-y-3 border-l border-hairline pl-5">
            {list.map((ev) => (
              <TimelineItem key={ev.id} ev={ev} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineItem({ ev }: { ev: LegacyEvent }) {
  const time = new Date(ev.ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dot = (color: string) => (
    <span
      className="absolute -left-[7px] top-2 h-3 w-3 rounded-full ring-4 ring-background"
      style={{ background: color }}
    />
  );

  if (ev.kind === "completion") {
    const color = CATEGORY_TOKEN[ev.category];
    return (
      <li className="relative rounded-xl border border-hairline bg-card/50 p-3 backdrop-blur-sm">
        {dot(color)}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
              {CATEGORY_LABEL[ev.category]} · {ev.type}
            </p>
            <p className="mt-1 font-medium">{ev.title}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-sm font-bold text-xp">+{ev.xp}</p>
            <p className="text-[10px] text-muted-foreground">{time}</p>
          </div>
        </div>
      </li>
    );
  }
  if (ev.kind === "levelup") {
    return (
      <li className="relative rounded-xl border border-hairline bg-card/50 p-3 backdrop-blur-sm">
        {dot("var(--main-quest)")}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-display font-semibold">Level {ev.level} reached</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{time}</p>
        </div>
      </li>
    );
  }
  if (ev.kind === "achievement") {
    const ach = ACHIEVEMENTS.find((a) => a.id === ev.achievementId);
    return (
      <li className="relative rounded-xl border border-hairline bg-card/50 p-3 backdrop-blur-sm">
        {dot(ach ? TIER_COLOR[ach.tier] : "var(--primary)")}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" style={{ color: ach ? TIER_COLOR[ach.tier] : undefined }} />
            <div>
              <p className="font-display font-semibold">{ach?.name ?? "Achievement"}</p>
              <p className="text-xs text-muted-foreground">{ach?.description}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{time}</p>
        </div>
      </li>
    );
  }
  // journal
  return (
    <li className="relative rounded-xl border border-hairline bg-card/50 p-3 backdrop-blur-sm">
      {dot("var(--color-cat-lifestyle)")}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <p className="font-display font-semibold">{ev.title}</p>
          </div>
          {ev.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {ev.body}
            </p>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{time}</p>
      </div>
    </li>
  );
}

function AchievementsView({ unlocked }: { unlocked: string[] }) {
  const unlockedSet = new Set(unlocked);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ACHIEVEMENTS.map((a) => {
        const on = unlockedSet.has(a.id);
        return (
          <div
            key={a.id}
            className={cn(
              "rounded-2xl border p-4 transition",
              on
                ? "border-hairline bg-card/70 backdrop-blur-sm"
                : "border-dashed border-hairline bg-card/30 opacity-60",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: on
                    ? `color-mix(in oklch, ${TIER_COLOR[a.tier]} 24%, transparent)`
                    : "var(--muted)",
                  color: on ? TIER_COLOR[a.tier] : undefined,
                }}
              >
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold">{a.name}</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] tracking-widest uppercase"
                    style={{
                      background: `color-mix(in oklch, ${TIER_COLOR[a.tier]} 16%, transparent)`,
                      color: TIER_COLOR[a.tier],
                    }}
                  >
                    {a.tier}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MilestonesView({ events }: { events: LegacyEvent[] }) {
  const items = events.filter(
    (e) => e.kind === "levelup" || e.kind === "achievement",
  );
  if (items.length === 0) {
    return <EmptyPanel title="No milestones yet" body="Level up or unlock an achievement to write history." />;
  }
  return (
    <ol className="relative space-y-3 border-l border-hairline pl-5">
      {items.map((ev) => (
        <TimelineItem key={ev.id} ev={ev} />
      ))}
    </ol>
  );
}

function VaultView({ events }: { events: LegacyEvent[] }) {
  const addJournal = useQuests((s) => s.addJournal);
  const removeEvent = useQuests((s) => s.removeEvent);
  const entries = events.filter((e) => e.kind === "journal") as Extract<
    LegacyEvent,
    { kind: "journal" }
  >[];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const save = () => {
    if (!body.trim() && !title.trim()) return;
    addJournal(title, body);
    setTitle("");
    setBody("");
    setOpen(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "memory" : "memories"} saved.
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur-sm hover:bg-card"
        >
          <Plus className="h-3.5 w-3.5" /> New entry
        </button>
      </div>

      {open && (
        <div className="mb-6 rounded-2xl border border-hairline bg-card/60 p-4 backdrop-blur-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-hairline bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened? What did you learn?"
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-hairline bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save memory
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyPanel title="Empty vault" body="Save a memory and it stays with you forever." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((e) => (
            <article
              key={e.id}
              className="group relative rounded-2xl border border-hairline bg-card/60 p-4 backdrop-blur-sm"
            >
              <button
                type="button"
                onClick={() => removeEvent(e.id)}
                aria-label="Delete memory"
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                {new Date(e.ts).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="mt-1 font-display font-semibold">{e.title}</p>
              {e.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {e.body}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewView({
  events,
  character,
}: {
  events: LegacyEvent[];
  character: ReturnType<typeof useQuests.getState>["character"];
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEvents = events.filter((e) => e.ts >= monthStart);
  const completions = monthEvents.filter((e) => e.kind === "completion") as Extract<
    LegacyEvent,
    { kind: "completion" }
  >[];
  const levelUps = monthEvents.filter((e) => e.kind === "levelup").length;
  const achievements = monthEvents.filter((e) => e.kind === "achievement").length;
  const xpGained = completions.reduce((sum, c) => sum + c.xp, 0);

  const byCategory: Record<string, number> = {};
  for (const c of completions) {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + c.xp;
  }
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const monthLabel = now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
      <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
        Monthly Review
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold">{monthLabel}</h2>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReviewStat label="Quests done" value={completions.length} />
        <ReviewStat label="XP earned" value={xpGained} />
        <ReviewStat label="Level-ups" value={levelUps} />
        <ReviewStat label="Achievements" value={achievements} />
      </div>

      <div className="mt-8 space-y-3 text-sm">
        <p className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          You're on a <strong>{character.streakDays}-day</strong> streak. Momentum is{" "}
          <strong>{Math.round(character.momentum * 100)}%</strong>.
        </p>
        {topCat && (
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Most XP this month came from{" "}
            <strong style={{ color: CATEGORY_TOKEN[topCat[0] as keyof typeof CATEGORY_TOKEN] }}>
              {CATEGORY_LABEL[topCat[0] as keyof typeof CATEGORY_LABEL]}
            </strong>
            {" "}({topCat[1].toLocaleString()} XP).
          </p>
        )}
        {completions.length === 0 && (
          <p className="text-muted-foreground">
            No completions logged this month yet — one quest is enough to start writing this chapter.
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-hairline bg-background/40 p-3">
      <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-card/40 p-10 text-center">
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function groupByDay(events: LegacyEvent[]): [string, LegacyEvent[]][] {
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  const map = new Map<string, LegacyEvent[]>();
  for (const e of sorted) {
    const d = new Date(e.ts);
    const key = d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()];
}
