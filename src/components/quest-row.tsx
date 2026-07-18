import { Check, Clock, Flame, MoreHorizontal, Copy, Trash2, Pencil } from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_TOKEN,
} from "@/lib/demo-data";
import { useQuests, type Quest } from "@/lib/quests-store";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QuestRow({ quest }: { quest: Quest }) {
  const complete = useQuests((s) => s.complete);
  const uncomplete = useQuests((s) => s.uncomplete);
  const duplicate = useQuests((s) => s.duplicate);
  const remove = useQuests((s) => s.remove);
  const openEditor = useUI((s) => s.openEditor);
  const done = !!quest.completed;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-hairline bg-card/60 p-3 pr-2 transition hover:bg-card",
        done && "opacity-60",
      )}
    >
      <button
        aria-label={done ? "Undo complete" : "Complete quest"}
        onClick={() => (done ? uncomplete(quest.id) : complete(quest.id))}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition",
          done
            ? "border-primary/40 bg-primary/20 text-primary"
            : "border-hairline bg-background text-muted-foreground hover:border-primary/50 hover:text-primary",
        )}
      >
        {done ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : (
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: CATEGORY_TOKEN[quest.category] }}
          />
        )}
      </button>

      <button
        onClick={() => openEditor(quest.id)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={cn(
            "truncate text-sm font-medium",
            done && "line-through decoration-primary/60",
          )}
        >
          {quest.title}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span
            className="inline-flex items-center gap-1.5"
            style={{ color: CATEGORY_TOKEN[quest.category] }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CATEGORY_TOKEN[quest.category] }}
            />
            {CATEGORY_LABEL[quest.category]}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatMinutes(quest.estimatedMinutes)}
          </span>
          {quest.priority === "critical" || quest.priority === "high" ? (
            <span className="inline-flex items-center gap-1 text-boss">
              <Flame className="h-3 w-3" />
              {quest.priority}
            </span>
          ) : null}
        </div>
      </button>

      <div className="shrink-0 pr-1 text-right">
        <div className="font-display text-sm font-semibold text-xp">
          +{quest.xp}
        </div>
        <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
          XP
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="Quest actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEditor(quest.id)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicate(quest.id)}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => remove(quest.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
