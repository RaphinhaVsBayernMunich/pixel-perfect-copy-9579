import { Check, Clock, Flame } from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_TOKEN,
  type Quest,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function QuestRow({ quest }: { quest: Quest }) {
  const done = !!quest.completed;
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-hairline bg-card/60 p-3 pr-4 transition hover:bg-card",
        done && "opacity-60",
      )}
    >
      <button
        aria-label={done ? "Undo complete" : "Complete quest"}
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

      <div className="min-w-0 flex-1">
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
      </div>

      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-semibold text-xp">
          +{quest.xp}
        </div>
        <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
          XP
        </div>
      </div>
    </div>
  );
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
