import { useMemo, useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";
import { useQuests, suggestXp, type Quest } from "@/lib/quests-store";
import {
  CATEGORY_LABEL,
  CATEGORY_TOKEN,
  type Category,
  type Difficulty,
  type Priority,
  type QuestType,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const TYPES: { value: QuestType; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "main", label: "Main" },
  { value: "side", label: "Side" },
  { value: "boss", label: "Boss" },
];

const CATEGORIES: Category[] = [
  "fitness", "business", "academics", "coding", "football",
  "creativity", "finance", "health", "relationships", "lifestyle",
];

const DIFFICULTIES: { value: Difficulty; label: string; minutes: number }[] = [
  { value: "very-easy", label: "Very easy", minutes: 15 },
  { value: "easy", label: "Easy", minutes: 30 },
  { value: "medium", label: "Medium", minutes: 60 },
  { value: "hard", label: "Hard", minutes: 120 },
  { value: "extreme", label: "Extreme", minutes: 240 },
];

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low", "someday"];

export function QuestQuickAdd() {
  const open = useUI((s) => s.quickAddOpen);
  const close = useUI((s) => s.closeQuickAdd);
  const add = useQuests((s) => s.add);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<QuestType>("daily");
  const [category, setCategory] = useState<Category>("coding");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [priority, setPriority] = useState<Priority>("medium");

  const xp = useMemo(() => suggestXp(type, difficulty, priority), [type, difficulty, priority]);
  const minutes = DIFFICULTIES.find((d) => d.value === difficulty)!.minutes;

  function reset() {
    setTitle("");
    setType("daily");
    setCategory("coding");
    setDifficulty("medium");
    setPriority("medium");
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim()) return;
    const q: Omit<Quest, "id"> = {
      title: title.trim(),
      type,
      category,
      difficulty,
      priority,
      estimatedMinutes: minutes,
      xp,
      scheduledFor: type === "daily" ? new Date().toISOString().slice(0, 10) : undefined,
    };
    add(q);
    reset();
    close();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-lg border-hairline bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New quest</DialogTitle>
          <DialogDescription className="text-xs">
            Under 30 seconds. Refine details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 pt-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to accomplish?"
            className="h-11 border-hairline bg-background/60 text-base"
          />

          <ChipGroup label="Type">
            {TYPES.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                {t.label}
              </Chip>
            ))}
          </ChipGroup>

          <ChipGroup label="Category">
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                accentColor={CATEGORY_TOKEN[c]}
              >
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </ChipGroup>

          <div className="grid grid-cols-2 gap-4">
            <ChipGroup label="Difficulty" wrap>
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d.value}
                  active={difficulty === d.value}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </Chip>
              ))}
            </ChipGroup>

            <ChipGroup label="Priority" wrap>
              {PRIORITIES.map((p) => (
                <Chip key={p} active={priority === p} onClick={() => setPriority(p)}>
                  {p}
                </Chip>
              ))}
            </ChipGroup>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-hairline bg-background/40 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Estimated reward
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">≈ {minutes}m</span>
              <span className="inline-flex items-center gap-1 font-display font-semibold text-xp">
                <Zap className="h-3.5 w-3.5" /> +{xp} XP
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create quest
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChipGroup({
  label,
  children,
  wrap,
}: {
  label: string;
  children: React.ReactNode;
  wrap?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className={cn("flex gap-1.5", wrap ? "flex-wrap" : "flex-wrap")}>{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  accentColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-hairline bg-background/40 text-muted-foreground hover:text-foreground",
      )}
      style={active && accentColor ? { borderColor: accentColor, color: accentColor, background: `color-mix(in oklch, ${accentColor} 15%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}
