import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { CATEGORY_TOKEN, CATEGORY_LABEL } from "@/lib/demo-data";
import { useQuests } from "@/lib/quests-store";
import { QuestRow } from "@/components/quest-row";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const quests = useQuests((s) => s.quests);
  const character = useQuests((s) => s.character);
  const daily = quests.filter((q) => q.type === "daily");
  const doneToday = daily.filter((q) => q.completed).length;
  const main = quests.find((q) => q.type === "main" && !q.completed);
  const boss = quests.find((q) => q.type === "boss" && !q.completed);
  const weekly = quests.filter((q) => q.type === "weekly" && !q.completed);

  const xpPct = Math.min(100, (character.xp / character.xpToNext) * 100);
  const todayPct = daily.length ? (doneToday / daily.length) * 100 : 0;

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-4 md:px-10 md:pt-12">
      {/* Hero — character HUD */}
      <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {dateStr}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight font-semibold md:text-5xl">
            Welcome back, <span className="text-primary">{character.name}</span>.
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {character.season} · Day {character.streakDays}. You've completed{" "}
            <span className="text-foreground">{doneToday} of {daily.length}</span>{" "}
            quests today. One more and momentum holds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatChip icon={<Zap className="h-3.5 w-3.5" />} label="Streak" value={`${character.streakDays}d`} />
          <StatChip icon={<Trophy className="h-3.5 w-3.5" />} label="Level" value={String(character.level)} accent />
        </div>
      </header>

      {/* Level + XP bar */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-hairline bg-card/60 p-5 shadow-glow-xp/50 backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Life Level
            </p>
            <p className="mt-1 font-display text-3xl font-bold">
              {character.level}
              <span className="ml-2 align-middle text-sm text-muted-foreground">
                · {character.title}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-semibold text-xp">
              {character.xp.toLocaleString()}
              <span className="text-muted-foreground"> / {character.xpToNext.toLocaleString()}</span>
            </p>
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
              XP to next level
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60 ring-hairline">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </section>

      {/* Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Main quest */}
        {main && (
          <Panel className="md:col-span-2 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(60% 100% at 90% 0%, var(--main-quest), transparent 60%)",
              }}
            />
            <div className="relative">
              <PanelHeading icon={<Target className="h-4 w-4" />} title="Main Quest" />
              <h3 className="mt-3 font-display text-2xl font-semibold">
                {main.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {main.subtasksDone}/{main.subtasksTotal} milestones · deadline{" "}
                {main.deadline}
              </p>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-display font-semibold">
                    {Math.round((main.progress ?? 0) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background/60 ring-hairline">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(main.progress ?? 0) * 100}%`,
                      background: "var(--main-quest)",
                    }}
                  />
                </div>
              </div>

              <Link
                to="/quests"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
              >
                Open quest board <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Panel>
        )}

        {/* Boss battle countdown */}
        {boss && (
          <Panel className="relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(80% 80% at 100% 0%, var(--boss), transparent 60%)",
              }}
            />
            <div className="relative">
              <PanelHeading icon={<Flame />} title="Boss Battle" tone="boss" />
              <h3 className="mt-3 font-display text-xl font-semibold">
                {boss.title}
              </h3>
              <p className="mt-4 font-display text-4xl font-bold text-boss">
                {daysUntil(boss.deadline!)}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  days
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {boss.deadline}
              </p>
            </div>
          </Panel>
        )}

        {/* Today's quests */}
        <Panel className="md:col-span-2">
          <div className="flex items-center justify-between">
            <PanelHeading icon={<Zap className="h-4 w-4" />} title="Today" />
            <span className="font-display text-xs text-muted-foreground">
              {doneToday}/{daily.length} · {Math.round(todayPct)}%
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {daily.map((q) => (
              <QuestRow key={q.id} quest={q} />
            ))}
          </div>
        </Panel>

        {/* AI recommendation + weekly */}
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeading icon={<Sparkles className="h-4 w-4" />} title="AI Coach" />
            <p className="mt-3 text-sm leading-relaxed">
              Your afternoon is light. Move{" "}
              <span className="text-primary font-medium">Ship auth flow refactor</span>{" "}
              into a 90-minute focus block at 3:00pm — you complete coding quests
              23% faster after 2pm.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Apply
              </button>
              <button className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                Why?
              </button>
            </div>
          </Panel>

          {weekly[0] && (
            <Panel>
              <PanelHeading title="This Week" />
              <h4 className="mt-3 text-sm font-medium">{weekly[0].title}</h4>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60 ring-hairline">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${(weekly[0].progress ?? 0) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.round((weekly[0].progress ?? 0) * 100)}% complete · +
                {weekly[0].xp} XP on finish
              </p>
            </Panel>
          )}
        </div>

        {/* Category rings */}
        <Panel className="md:col-span-3">
          <PanelHeading title="XP by category" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {(Object.keys(character.categoryXp) as (keyof typeof character.categoryXp)[]).map(
              (cat) => {
                const val = character.categoryXp[cat];
                const max = Math.max(...Object.values(character.categoryXp));
                const pct = max ? (val / max) * 100 : 0;
                return (
                  <div
                    key={cat}
                    className="rounded-xl border border-hairline bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-medium tracking-wide uppercase"
                        style={{ color: CATEGORY_TOKEN[cat] }}
                      >
                        {CATEGORY_LABEL[cat]}
                      </span>
                    </div>
                    <p className="mt-1 font-display text-lg font-semibold">
                      {val.toLocaleString()}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: CATEGORY_TOKEN[cat],
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Flame(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function daysUntil(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((d - now) / 86400000));
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-hairline bg-card/60 p-5 backdrop-blur-sm ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

function PanelHeading({
  icon,
  title,
  tone,
}: {
  icon?: React.ReactNode;
  title: string;
  tone?: "boss";
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.2em] uppercase">
      {icon && (
        <span className={tone === "boss" ? "text-boss" : "text-primary"}>
          {icon}
        </span>
      )}
      <span className="text-muted-foreground">{title}</span>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-hairline bg-card/60 px-3 py-2 backdrop-blur-sm">
      <span className={accent ? "text-primary" : "text-muted-foreground"}>
        {icon}
      </span>
      <div>
        <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <p className={`font-display text-sm font-semibold ${accent ? "text-primary" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
