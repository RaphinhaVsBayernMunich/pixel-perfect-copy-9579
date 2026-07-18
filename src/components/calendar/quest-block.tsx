import { AlertTriangle, Clock, Zap } from "lucide-react";
import { CATEGORY_TOKEN } from "@/lib/demo-data";
import type { Quest } from "@/lib/quests-store";
import { useUI } from "@/lib/ui-store";
import { fmtTime } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface Props {
  quest: Quest;
  conflict?: boolean;
  compact?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function QuestBlock({
  quest,
  conflict,
  compact,
  onDragStart,
  style,
  className,
}: Props) {
  const openEditor = useUI((s) => s.openEditor);
  const color = CATEGORY_TOKEN[quest.category];

  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/quest", quest.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(e);
      }}
      onClick={() => openEditor(quest.id)}
      style={{
        borderLeftColor: color,
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
        ...style,
      }}
      className={cn(
        "group relative w-full cursor-grab overflow-hidden rounded-md border-l-2 border-hairline px-2 py-1.5 text-left ring-hairline transition hover:ring-1 active:cursor-grabbing",
        quest.completed && "opacity-50",
        conflict && "ring-1 ring-destructive/60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p
          className={cn(
            "min-w-0 truncate text-[11px] font-medium leading-tight",
            quest.completed && "line-through",
          )}
          style={{ color }}
        >
          {quest.title}
        </p>
        {conflict ? (
          <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
        ) : null}
      </div>
      {!compact ? (
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          {quest.startTime ? (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {fmtTime(quest.startTime)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-0.5 text-xp">
            <Zap className="h-2.5 w-2.5" />+{quest.xp}
          </span>
        </div>
      ) : null}
    </button>
  );
}
