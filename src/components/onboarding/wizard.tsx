import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { useQuests } from "@/lib/quests-store";
import { generateStarterQuests } from "@/lib/ai.functions";
import {
  EMPTY_ONBOARDING,
  PROFESSIONS,
  INTEREST_OPTIONS,
  SKILL_OPTIONS,
  THEMES,
  CELEBRATIONS,
  AI_FEATURES,
  type OnboardingProfile,
  type Profession,
  type Chronotype,
  type PlanningStyle,
  type CoachStyle,
  type FocusLength,
  type Theme,
  type CelebrationStyle,
} from "@/lib/onboarding-types";

const STEPS = [
  "welcome", "basics", "profession", "goals", "interests", "skills",
  "schedule", "productivity", "personalization", "celebration", "ai", "build",
] as const;

const TOTAL = STEPS.length;

export function OnboardingWizard() {
  const user = useAuth((s) => s.user);
  const setOnboarding = useQuests((s) => s.setOnboarding);
  const addQuest = useQuests((s) => s.add);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingProfile>({
    ...EMPTY_ONBOARDING,
    preferredName: user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    units: "metric",
    focusLength: 45,
    chronotype: "balanced",
    planningStyle: "balanced",
    coachStyle: "balanced",
    theme: "dark",
    celebration: "modern",
    aiFeatures: Object.fromEntries(AI_FEATURES.map((f) => [f.id, true])),
  });

  const update = (patch: Partial<OnboardingProfile>) => setData((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const current = STEPS[step];
  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-ambient overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            <Swords className="h-3.5 w-3.5 text-primary" /> QuestOS Setup
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {step + 1} / {TOTAL}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 rounded-full bg-surface-2 overflow-hidden mb-10">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-xp"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          />
        </div>

        {/* Step content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28 }}
            >
              {current === "welcome" && <WelcomeStep name={data.preferredName} />}
              {current === "basics" && <BasicsStep data={data} update={update} />}
              {current === "profession" && <ProfessionStep data={data} update={update} />}
              {current === "goals" && <GoalsStep data={data} update={update} />}
              {current === "interests" && <InterestsStep data={data} update={update} />}
              {current === "skills" && <SkillsStep data={data} update={update} />}
              {current === "schedule" && <ScheduleStep data={data} update={update} />}
              {current === "productivity" && <ProductivityStep data={data} update={update} />}
              {current === "personalization" && <PersonalizationStep data={data} update={update} />}
              {current === "celebration" && <CelebrationStep data={data} update={update} />}
              {current === "ai" && <AIStep data={data} update={update} />}
              {current === "build" && (
                <BuildStep
                  data={data}
                  onDone={() => setOnboarding(data, true)}
                  onAddQuest={addQuest}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        {current !== "build" && (
          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {current !== "welcome" && (
                <Button variant="ghost" onClick={next} className="text-muted-foreground">
                  Skip
                </Button>
              )}
              <Button onClick={next} className="gap-1.5">
                {current === "welcome" ? "Begin your journey" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Step components
// ────────────────────────────────────────────────────────────────

function StepHeader({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <div className="text-xs font-medium tracking-widest uppercase text-primary mb-2">
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-4xl leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mt-3 text-muted-foreground max-w-lg">{sub}</p>}
    </div>
  );
}

function WelcomeStep({ name }: { name?: string }) {
  return (
    <div className="pt-6">
      <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-8 w-8" />
      </div>
      <h1 className="font-display text-5xl leading-tight tracking-tight">
        Welcome{name ? `, ${name}` : ""}.
      </h1>
      <p className="mt-4 font-display text-2xl text-muted-foreground italic">
        "Life is the biggest RPG you'll ever play."
      </p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          ["Quests", "Turn goals into actionable missions."],
          ["XP & Levels", "Every win compounds."],
          ["Legacy", "Nothing you do is forgotten."],
          ["AI Coach", "Your operating system's brain."],
        ].map(([t, s]) => (
          <div key={t} className="rounded-xl border border-hairline bg-surface p-4">
            <div className="font-display text-sm font-semibold">{t}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BasicsStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 1 · Basics" title="Who's the hero?" sub="A little grounding. You can change any of this later." />
      <div className="space-y-4">
        <Field label="What should we call you?">
          <Input
            value={data.preferredName ?? ""}
            onChange={(e) => update({ preferredName: e.target.value })}
            placeholder="Your preferred name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age (optional)">
            <Input
              type="number"
              min={13}
              max={120}
              value={data.age ?? ""}
              onChange={(e) => update({ age: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="Country (optional)">
            <Input value={data.country ?? ""} onChange={(e) => update({ country: e.target.value })} placeholder="e.g. Germany" />
          </Field>
        </div>
        <Field label="Timezone">
          <Input value={data.timezone ?? ""} onChange={(e) => update({ timezone: e.target.value })} />
        </Field>
        <Field label="Units">
          <ChipGroup
            value={data.units}
            onChange={(v) => update({ units: v as "metric" | "imperial" })}
            options={[
              { value: "metric", label: "Metric" },
              { value: "imperial", label: "Imperial" },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

function ProfessionStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 2 · Profession" title="What's your day job?" sub="This unlocks specialized quests and follow-up questions." />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROFESSIONS.map((p) => {
          const active = data.profession === p.id;
          return (
            <button
              key={p.id}
              onClick={() => update({ profession: p.id as Profession })}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-hairline bg-surface hover:bg-surface-2",
              )}
            >
              <span className="text-lg">{p.emoji}</span>
              <span className="text-sm font-medium">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GoalsStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 3 · Ambition" title="What are you playing for?" sub="Your goals become the AI's north star." />
      <div className="space-y-4">
        <Field label="Your biggest goal this year">
          <Textarea
            rows={2}
            value={data.yearGoal ?? ""}
            onChange={(e) => update({ yearGoal: e.target.value })}
            placeholder="e.g. Ship my SaaS to 100 paying customers"
          />
        </Field>
        <Field label="Where do you want to be in five years?">
          <Textarea
            rows={2}
            value={data.fiveYearGoal ?? ""}
            onChange={(e) => update({ fiveYearGoal: e.target.value })}
            placeholder="Describe the version of you five years from now"
          />
        </Field>
        <Field label="Describe your dream life">
          <Textarea
            rows={3}
            value={data.dreamLife ?? ""}
            onChange={(e) => update({ dreamLife: e.target.value })}
            placeholder="Where you live, what you do, who's around you"
          />
        </Field>
      </div>
    </div>
  );
}

function InterestsStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  const toggle = (label: string) => {
    const set = new Set(data.interests);
    set.has(label) ? set.delete(label) : set.add(label);
    update({ interests: [...set] });
  };
  return (
    <div>
      <StepHeader
        eyebrow="Step 4 · Interests"
        title="What do you love?"
        sub="Pick as many as you like. These become your XP categories."
      />
      <div className="flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((opt) => {
          const active = data.interests.includes(opt.label);
          return (
            <button
              key={opt.label}
              onClick={() => toggle(opt.label)}
              className={cn(
                "px-3.5 py-2 rounded-full border text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-hairline bg-surface hover:bg-surface-2",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkillsStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  const toggle = (label: string) => {
    const set = new Set(data.skills);
    set.has(label) ? set.delete(label) : set.add(label);
    update({ skills: [...set] });
  };
  return (
    <div>
      <StepHeader
        eyebrow="Step 5 · Growth"
        title="What do you want to level up?"
        sub="These become the pillars of your character progression."
      />
      <div className="flex flex-wrap gap-2">
        {SKILL_OPTIONS.map((s) => {
          const active = data.skills.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={cn(
                "px-3.5 py-2 rounded-full border text-sm font-medium transition-colors",
                active
                  ? "border-xp bg-xp text-xp-foreground"
                  : "border-hairline bg-surface hover:bg-surface-2",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 6 · Rhythm" title="How does your day flow?" sub="AI uses this to draft your calendar." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wake time">
          <Input type="time" value={data.wakeTime ?? ""} onChange={(e) => update({ wakeTime: e.target.value })} />
        </Field>
        <Field label="Sleep time">
          <Input type="time" value={data.sleepTime ?? ""} onChange={(e) => update({ sleepTime: e.target.value })} />
        </Field>
        <Field label="Work / school hours">
          <Input value={data.workHours ?? ""} onChange={(e) => update({ workHours: e.target.value })} placeholder="e.g. 9-17" />
        </Field>
        <Field label="Preferred focus hours">
          <Input value={data.focusHours ?? ""} onChange={(e) => update({ focusHours: e.target.value })} placeholder="e.g. 6-9, 20-22" />
        </Field>
      </div>
    </div>
  );
}

function ProductivityStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 7 · Style" title="How do you operate?" />
      <div className="space-y-5">
        <Field label="Chronotype">
          <ChipGroup
            value={data.chronotype}
            onChange={(v) => update({ chronotype: v as Chronotype })}
            options={[
              { value: "morning", label: "Morning person" },
              { value: "night", label: "Night owl" },
              { value: "flexible", label: "Flexible" },
              { value: "balanced", label: "Balanced" },
            ]}
          />
        </Field>
        <Field label="Preferred focus block">
          <ChipGroup
            value={String(data.focusLength ?? "")}
            onChange={(v) => update({ focusLength: Number(v) as FocusLength })}
            options={[
              { value: "25", label: "25 min" },
              { value: "45", label: "45 min" },
              { value: "60", label: "60 min" },
              { value: "90", label: "90 min" },
            ]}
          />
        </Field>
        <Field label="Planning style">
          <ChipGroup
            value={data.planningStyle}
            onChange={(v) => update({ planningStyle: v as PlanningStyle })}
            options={[
              { value: "strict", label: "Strict" },
              { value: "balanced", label: "Balanced" },
              { value: "flexible", label: "Flexible" },
            ]}
          />
        </Field>
        <Field label="AI coaching style">
          <ChipGroup
            value={data.coachStyle}
            onChange={(v) => update({ coachStyle: v as CoachStyle })}
            options={[
              { value: "gentle", label: "Gentle" },
              { value: "balanced", label: "Balanced" },
              { value: "challenging", label: "Challenging" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

function PersonalizationStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 8 · Theme" title="Choose your world." />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const active = data.theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => update({ theme: t.id as Theme })}
              className={cn(
                "relative rounded-xl border overflow-hidden aspect-[4/3] text-left transition-transform",
                active ? "border-primary scale-[0.98]" : "border-hairline hover:scale-[0.98]",
              )}
              style={{ backgroundImage: t.swatch, backgroundSize: "cover" }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-end p-3">
                <span className="font-display text-sm font-semibold text-white drop-shadow-lg">{t.label}</span>
              </div>
              {active && (
                <div className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CelebrationStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 9 · Celebration" title="How should wins feel?" sub="You can switch this anytime." />
      <div className="space-y-2">
        {CELEBRATIONS.map((c) => {
          const active = data.celebration === c.id;
          return (
            <button
              key={c.id}
              onClick={() => update({ celebration: c.id as CelebrationStyle })}
              className={cn(
                "w-full flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "border-hairline bg-surface hover:bg-surface-2",
              )}
            >
              <div>
                <div className="font-display text-sm font-semibold">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.blurb}</div>
              </div>
              {active && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AIStep({ data, update }: { data: OnboardingProfile; update: (p: Partial<OnboardingProfile>) => void }) {
  const toggle = (id: string) => {
    update({ aiFeatures: { ...data.aiFeatures, [id]: !(data.aiFeatures?.[id] ?? true) } });
  };
  return (
    <div>
      <StepHeader eyebrow="Step 10 · AI" title="What can the AI do for you?" sub="You keep control. Toggle anything off." />
      <div className="space-y-2">
        {AI_FEATURES.map((f) => {
          const enabled = data.aiFeatures?.[f.id] ?? true;
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-4 text-left hover:bg-surface-2"
            >
              <div>
                <div className="font-display text-sm font-semibold">{f.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
              </div>
              <div
                className={cn(
                  "h-6 w-11 rounded-full transition-colors relative",
                  enabled ? "bg-primary" : "bg-surface-2",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BuildStep({
  data,
  onDone,
  onAddQuest,
}: {
  data: OnboardingProfile;
  onDone: () => void;
  onAddQuest: ReturnType<typeof useQuests.getState>["add"];
}) {
  const generate = useServerFn(generateStarterQuests);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [welcome, setWelcome] = useState<string>("");
  const [count, setCount] = useState(0);

  const start = async () => {
    setStatus("loading");
    try {
      const result: any = await generate({
        data: {
          preferredName: data.preferredName,
          profession: data.profession,
          yearGoal: data.yearGoal,
          fiveYearGoal: data.fiveYearGoal,
          dreamLife: data.dreamLife,
          interests: data.interests,
          skills: data.skills,
          chronotype: data.chronotype,
        },
      });
      const all = [result.mainQuest, ...(result.starters ?? [])].filter(Boolean);
      let added = 0;
      for (const q of all) {
        onAddQuest({
          title: q.title,
          description: q.description,
          type: q.type,
          category: q.category,
          priority: q.priority,
          difficulty: q.difficulty,
          estimatedMinutes: q.estimatedMinutes,
          xp: Math.max(20, Math.round(q.estimatedMinutes * 2)),
        });
        added++;
      }
      setCount(added);
      setWelcome(result.welcome ?? "");
      setStatus("ready");
    } catch (err) {
      console.error(err);
      toast.error("AI generation failed", { description: (err as Error).message });
      setStatus("error");
    }
  };

  // auto-start on mount
  useMemo(() => {
    if (status === "idle") void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pt-6 text-center">
      {status === "loading" && (
        <>
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h1 className="mt-6 font-display text-3xl">Building your Life OS…</h1>
          <p className="mt-3 text-muted-foreground">
            AI is drafting your main quest, starter missions, and character.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {["Character", "Main Quest", "Starter quests", "AI welcome"].map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                />
                {s}
              </li>
            ))}
          </ul>
        </>
      )}

      {status === "ready" && (
        <>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-xp/20 text-xp"
          >
            <Sparkles className="h-10 w-10" />
          </motion.div>
          <h1 className="mt-6 font-display text-4xl">Your journey begins today.</h1>
          {welcome && (
            <p className="mt-4 text-muted-foreground italic max-w-md mx-auto">"{welcome}"</p>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            {count > 0 ? `${count} starter quests added to your board.` : "Add your first quest from the dashboard."}
          </p>
          <Button size="lg" onClick={onDone} className="mt-8 gap-1.5">
            Enter QuestOS <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <X className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-3xl">Something went sideways.</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't reach the AI. You can enter anyway and generate quests from the coach later.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => start()}>Try again</Button>
            <Button onClick={onDone}>Enter QuestOS</Button>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Small primitives
// ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function ChipGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-full border text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-hairline bg-surface hover:bg-surface-2",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
