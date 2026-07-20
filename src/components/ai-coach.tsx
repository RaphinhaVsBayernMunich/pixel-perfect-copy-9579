import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Compass, BookOpen, Sunrise, Check, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUI } from "@/lib/ui-store";
import { useQuests, suggestXp } from "@/lib/quests-store";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";
import { morningBrief, goalToQuests, reflectionPrompt } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

type GeneratedQuest = {
  title: string;
  description: string;
  type: "main" | "daily" | "weekly" | "side" | "boss";
  category: keyof typeof CATEGORY_LABEL;
  priority: "critical" | "high" | "medium" | "low" | "someday";
  difficulty: "very-easy" | "easy" | "medium" | "hard" | "extreme";
  estimatedMinutes: number;
};

export function AICoach() {
  const open = useUI((s) => s.aiCoachOpen);
  const close = useUI((s) => s.closeAICoach);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Coach
          </DialogTitle>
          <DialogDescription>
            Your operating system's brain — briefs, breakdowns, and reflection.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="brief" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="brief"><Sunrise className="mr-2 h-4 w-4" />Morning brief</TabsTrigger>
            <TabsTrigger value="goal"><Compass className="mr-2 h-4 w-4" />Goal → Quests</TabsTrigger>
            <TabsTrigger value="reflect"><BookOpen className="mr-2 h-4 w-4" />Reflect</TabsTrigger>
          </TabsList>
          <TabsContent value="brief" className="mt-4"><MorningBriefTab /></TabsContent>
          <TabsContent value="goal" className="mt-4"><GoalToQuestsTab /></TabsContent>
          <TabsContent value="reflect" className="mt-4"><ReflectionTab /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MorningBriefTab() {
  const character = useQuests((s) => s.character);
  const quests = useQuests((s) => s.quests);
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const runBrief = useServerFn(morningBrief);

  const today = new Date().toISOString().slice(0, 10);
  const todayQuests = quests
    .filter((q) => q.scheduledFor === today || (q.type === "daily" && !q.completed))
    .slice(0, 12);

  async function generate() {
    setLoading(true);
    try {
      const res = await runBrief({
        data: {
          characterName: character.name,
          level: character.level,
          streakDays: character.streakDays,
          momentum: character.momentum,
          todayQuests: todayQuests.map((q) => ({
            title: q.title,
            type: q.type,
            category: q.category,
            xp: q.xp,
            completed: q.completed,
            startTime: q.startTime,
          })),
        },
      });
      setBrief(res.brief);
    } catch (e) {
      toast.error("Couldn't generate brief", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A punchy read on today — {todayQuests.length} quest{todayQuests.length === 1 ? "" : "s"} in play.
      </p>
      {brief ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 font-display text-base leading-relaxed text-foreground">
          {brief}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-muted-foreground">
          Tap generate to get your morning read.
        </div>
      )}
      <Button onClick={generate} disabled={loading} className="w-full">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {brief ? "Regenerate" : "Generate morning brief"}
      </Button>
    </div>
  );
}

function GoalToQuestsTab() {
  const [goal, setGoal] = useState("");
  const [horizon, setHorizon] = useState<"week" | "month" | "quarter" | "year">("month");
  const [quests, setQuests] = useState<GeneratedQuest[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const runGoal = useServerFn(goalToQuests);
  const addQuest = useQuests((s) => s.add);

  async function generate() {
    if (goal.trim().length < 3) return;
    setLoading(true);
    setAccepted(new Set());
    try {
      const res = await runGoal({ data: { goal: goal.trim(), horizon } });
      setQuests(res.quests as GeneratedQuest[]);
      if (res.quests.length === 0) toast.error("The coach couldn't parse that — try rephrasing.");
    } catch (e) {
      toast.error("Couldn't break down goal", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  function acceptQuest(i: number, q: GeneratedQuest) {
    const xp = suggestXp(q.type, q.difficulty, q.priority);
    addQuest({ ...q, xp });
    setAccepted((s) => new Set(s).add(i));
    toast.success(`Added "${q.title}"`);
  }

  function acceptAll() {
    quests.forEach((q, i) => {
      if (!accepted.has(i)) acceptQuest(i, q);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="e.g. Ship my SaaS side-project"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
        />
        <div className="flex gap-2">
          {(["week", "month", "quarter", "year"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={cn(
                "flex-1 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                horizon === h ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {h}
            </button>
          ))}
        </div>
        <Button onClick={generate} disabled={loading || goal.trim().length < 3} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Compass className="mr-2 h-4 w-4" />}
          Break down goal
        </Button>
      </div>

      {quests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{quests.length} proposed quests</p>
            <button
              type="button"
              onClick={acceptAll}
              disabled={accepted.size === quests.length}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
            >
              Add all
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {quests.map((q, i) => {
              const token = CATEGORY_TOKEN[q.category];
              const isAdded = accepted.has(i);
              const xp = suggestXp(q.type, q.difficulty, q.priority);
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 transition-opacity",
                    isAdded ? "border-hairline opacity-50" : "border-hairline",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", token)} />
                        <p className="truncate font-display text-sm font-semibold">{q.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{q.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <span className="rounded bg-muted/40 px-1.5 py-0.5">{q.type}</span>
                        <span className="rounded bg-muted/40 px-1.5 py-0.5">{CATEGORY_LABEL[q.category]}</span>
                        <span className="rounded bg-muted/40 px-1.5 py-0.5">{q.difficulty}</span>
                        <span className="rounded bg-muted/40 px-1.5 py-0.5">{q.estimatedMinutes}m</span>
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-primary">+{xp} XP</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isAdded && acceptQuest(i, q)}
                      disabled={isAdded}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isAdded ? "border-hairline text-muted-foreground" : "border-primary/40 text-primary hover:bg-primary/10",
                      )}
                      aria-label={isAdded ? "Added" : "Add"}
                    >
                      {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ReflectionTab() {
  const character = useQuests((s) => s.character);
  const quests = useQuests((s) => s.quests);
  const events = useQuests((s) => s.events);
  const addJournal = useQuests((s) => s.addJournal);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const runReflect = useServerFn(reflectionPrompt);

  const recent = events
    .filter((e) => e.kind === "completion")
    .slice(0, 8)
    .map((e) => (e.kind === "completion" ? e.title : ""))
    .filter(Boolean);

  const totalXp = Object.values(character.categoryXp).reduce((a, b) => a + b, 0);

  async function generate() {
    setLoading(true);
    setAnswer("");
    try {
      const res = await runReflect({
        data: {
          recentCompletions: recent.length ? recent : quests.filter((q) => q.completed).slice(0, 6).map((q) => q.title),
          streakDays: character.streakDays,
          totalXp,
        },
      });
      setPrompt(res.prompt);
    } catch (e) {
      toast.error("Couldn't generate prompt", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!prompt || !answer.trim()) return;
    addJournal(prompt, answer.trim());
    toast.success("Saved to your Memory Vault");
    setPrompt("");
    setAnswer("");
  }

  return (
    <div className="space-y-4">
      {!prompt ? (
        <div className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-muted-foreground">
          Generate a reflection prompt tuned to your recent quests.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="font-display text-base leading-relaxed">{prompt}</p>
          </div>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write it out..."
            className="min-h-32"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={!answer.trim()} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Save to Memory Vault
            </Button>
            <Button variant="outline" onClick={() => { setPrompt(""); setAnswer(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {!prompt && (
        <Button onClick={generate} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
          Generate reflection prompt
        </Button>
      )}
    </div>
  );
}
