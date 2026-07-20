import { createFileRoute } from "@tanstack/react-router";
import { Award, Sparkles, Zap } from "lucide-react";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";
import { useQuests } from "@/lib/quests-store";
import { computeAttributes } from "@/lib/attributes";
import { ACHIEVEMENTS, TIER_COLOR } from "@/lib/achievements";
import { SubscriptionSection } from "@/components/subscription/subscription-section";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — QuestOS" },
      {
        name: "description",
        content:
          "Your character sheet: level, attributes, skills, projects, and settings.",
      },
      { property: "og:title", content: "Profile — QuestOS" },
      {
        property: "og:description",
        content: "Your character sheet and settings.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const character = useQuests((s) => s.character);
  const unlocked = useQuests((s) => s.unlockedAchievements);
  const attributes = computeAttributes(character.categoryXp);
  const maxAttr = Math.max(1, ...attributes.map((a) => a.value));
  const unlockedSet = new Set(unlocked);
  const recent = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).slice(0, 6);

  const topCategories = (Object.keys(character.categoryXp) as (keyof typeof character.categoryXp)[])
    .sort((a, b) => character.categoryXp[b] - character.categoryXp[a])
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-4 md:px-10 md:pt-12">
      {/* Hero */}
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm md:p-8">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 100% at 90% 0%, oklch(0.82 0.15 85 / 0.25), transparent 60%), radial-gradient(50% 90% at 10% 100%, oklch(0.68 0.20 285 / 0.20), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 ring-hairline">
              <span className="font-display text-3xl font-bold text-primary">
                {character.name.slice(0, 1)}
              </span>
              <span className="absolute -bottom-2 rounded-full bg-primary px-2 py-0.5 font-display text-xs font-bold text-primary-foreground">
                LV {character.level}
              </span>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {character.season}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold">
                {character.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {character.title} · Day {character.streakDays}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Total XP" value={character.xp.toLocaleString()} accent />
            <Stat label="Momentum" value={`${Math.round(character.momentum * 100)}%`} />
            <Stat label="Trophies" value={String(unlocked.length)} />
          </div>
        </div>
      </header>

      {/* Attributes */}
      <section className="mb-8">
        <SectionHeader icon={<Zap className="h-4 w-4" />} title="Attributes" hint="Derived from category XP" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attributes.map((a) => (
            <div
              key={a.key}
              className="rounded-xl border border-hairline bg-card/60 p-4 backdrop-blur-sm"
            >
              <div className="flex items-baseline justify-between">
                <p
                  className="font-display text-xs font-semibold tracking-[0.2em] uppercase"
                  style={{ color: `oklch(0.72 0.16 ${a.hue})` }}
                >
                  {a.key}
                </p>
                <p className="font-display text-2xl font-bold">{a.value}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.label}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60 ring-hairline">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(a.value / maxAttr) * 100}%`,
                    background: `oklch(0.72 0.16 ${a.hue})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill tree stubs (top categories) */}
      <section className="mb-8">
        <SectionHeader
          icon={<Sparkles className="h-4 w-4" />}
          title="Skill tree"
          hint="Your strongest paths"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topCategories.map((cat, i) => {
            const xp = character.categoryXp[cat];
            const tier = xp >= 2000 ? "Master" : xp >= 1000 ? "Adept" : xp >= 400 ? "Journeyman" : "Novice";
            return (
              <div
                key={cat}
                className="rounded-xl border border-hairline bg-card/60 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-display text-xs font-semibold tracking-[0.15em] uppercase"
                    style={{ color: CATEGORY_TOKEN[cat] }}
                  >
                    {CATEGORY_LABEL[cat]}
                  </span>
                  <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
                    #{i + 1}
                  </span>
                </div>
                <p className="mt-2 font-display text-xl font-semibold">{tier}</p>
                <p className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent trophies */}
      <section className="mb-8">
        <SectionHeader icon={<Award className="h-4 w-4" />} title="Trophies" hint={`${unlocked.length} unlocked`} />
        {recent.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-hairline bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Complete quests to unlock your first trophy.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border border-hairline bg-card/60 p-3 text-center backdrop-blur-sm",
                )}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: `color-mix(in oklch, ${TIER_COLOR[a.tier]} 24%, transparent)`,
                    color: TIER_COLOR[a.tier],
                  }}
                >
                  <Award className="h-5 w-5" />
                </div>
                <p className="font-display text-xs font-semibold leading-tight">
                  {a.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subscription */}
      <section className="mb-8">
        <SubscriptionSection />
      </section>

      <p className="text-xs text-muted-foreground">
        Cloud sync is always on. Premium unlocks unlimited AI, advanced analytics, themes, sounds, integrations, and more.
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-hairline bg-background/40 px-3 py-2">
      <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-semibold",
          accent && "text-xp",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h2 className="font-display text-sm font-semibold tracking-[0.2em] uppercase text-foreground">
          {title}
        </h2>
      </div>
      {hint && (
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
          {hint}
        </span>
      )}
    </div>
  );
}
