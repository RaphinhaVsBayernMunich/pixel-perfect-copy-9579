import { useEffect, useState } from "react";
import { Trash2, Zap } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const CATEGORIES: Category[] = [
  "fitness", "business", "academics", "coding", "football",
  "creativity", "finance", "health", "relationships", "lifestyle",
];
const TYPES: QuestType[] = ["daily", "weekly", "main", "side", "boss"];
const DIFFICULTIES: Difficulty[] = ["very-easy", "easy", "medium", "hard", "extreme"];
const PRIORITIES: Priority[] = ["critical", "high", "medium", "low", "someday"];

export function QuestEditor() {
  const id = useUI((s) => s.editorQuestId);
  const close = useUI((s) => s.closeEditor);
  const quest = useQuests((s) => s.quests.find((q) => q.id === id));
  const update = useQuests((s) => s.update);
  const remove = useQuests((s) => s.remove);

  const [draft, setDraft] = useState<Quest | undefined>(quest);

  useEffect(() => {
    setDraft(quest);
  }, [quest?.id]);

  const open = !!id && !!draft;

  if (!draft) {
    return (
      <Sheet open={!!id} onOpenChange={(o) => (o ? null : close())}>
        <SheetContent />
      </Sheet>
    );
  }

  function set<K extends keyof Quest>(key: K, value: Quest[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function save() {
    if (!draft || !quest) return;
    const xp = suggestXp(draft.type, draft.difficulty, draft.priority);
    update(draft.id, { ...draft, xp: draft.xp === quest.xp ? xp : draft.xp });
    close();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent
        side="right"
        className="w-full border-hairline bg-card/95 backdrop-blur-xl sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Edit quest</SheetTitle>
          <SheetDescription className="text-xs">
            Adjust anything. Changes save on close.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div>
            <Label className="text-[10px] tracking-[0.15em] uppercase">Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-2 h-11 border-hairline bg-background/60 text-base"
            />
          </div>

          <div>
            <Label className="text-[10px] tracking-[0.15em] uppercase">Description</Label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Notes, subtasks, context…"
              className="mt-2 min-h-[80px] border-hairline bg-background/60"
            />
          </div>

          <Row label="Type">
            {TYPES.map((t) => (
              <Chip key={t} active={draft.type === t} onClick={() => set("type", t)}>
                {t}
              </Chip>
            ))}
          </Row>

          <Row label="Category">
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={draft.category === c}
                onClick={() => set("category", c)}
                accentColor={CATEGORY_TOKEN[c]}
              >
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </Row>

          <div className="grid grid-cols-2 gap-4">
            <Row label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <Chip key={d} active={draft.difficulty === d} onClick={() => set("difficulty", d)}>
                  {d}
                </Chip>
              ))}
            </Row>
            <Row label="Priority">
              {PRIORITIES.map((p) => (
                <Chip key={p} active={draft.priority === p} onClick={() => set("priority", p)}>
                  {p}
                </Chip>
              ))}
            </Row>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] tracking-[0.15em] uppercase">Estimated minutes</Label>
              <Input
                type="number"
                min={5}
                value={draft.estimatedMinutes}
                onChange={(e) => set("estimatedMinutes", Number(e.target.value))}
                className="mt-2 h-10 border-hairline bg-background/60"
              />
            </div>
            <div>
              <Label className="text-[10px] tracking-[0.15em] uppercase">XP reward</Label>
              <div className="relative mt-2">
                <Input
                  type="number"
                  min={0}
                  value={draft.xp}
                  onChange={(e) => set("xp", Number(e.target.value))}
                  className="h-10 border-hairline bg-background/60 pr-10 text-xp"
                />
                <Zap className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-xp/60" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] tracking-[0.15em] uppercase">Scheduled for</Label>
              <Input
                type="date"
                value={draft.scheduledFor ?? ""}
                onChange={(e) => set("scheduledFor", e.target.value || undefined)}
                className="mt-2 h-10 border-hairline bg-background/60"
              />
            </div>
            <div>
              <Label className="text-[10px] tracking-[0.15em] uppercase">Start time</Label>
              <Input
                type="time"
                value={draft.startTime ?? ""}
                onChange={(e) => set("startTime", e.target.value || undefined)}
                className="mt-2 h-10 border-hairline bg-background/60"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] tracking-[0.15em] uppercase">Deadline</Label>
            <Input
              type="date"
              value={draft.deadline ?? ""}
              onChange={(e) => set("deadline", e.target.value || undefined)}
              className="mt-2 h-10 border-hairline bg-background/60"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                remove(draft.id);
                close();
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
