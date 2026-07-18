import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useQuests } from "@/lib/quests-store";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";

/**
 * Modern celebration style — subtle, satisfying, never childish.
 * Shows an overlay for ~1.6s after any quest completion.
 */
export function QuestCelebration() {
  const last = useQuests((s) => s.lastCompletion);
  const clear = useQuests((s) => s.clearCompletion);
  const quest = useQuests((s) =>
    last ? s.quests.find((q) => q.id === last.questId) : undefined,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!last || !quest) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1500);
    const t2 = setTimeout(() => clear(), 1700);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [last?.ts]);

  if (!last || !quest || !visible) return null;

  const color = CATEGORY_TOKEN[quest.category];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4"
    >
      <div
        className="animate-in fade-in slide-in-from-top-4 flex items-center gap-3 rounded-2xl border border-hairline bg-card/90 px-5 py-3 shadow-glow-xp backdrop-blur-xl duration-300"
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklch, ${color} 22%, transparent)`, color }}
        >
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold">Quest complete</p>
          <p className="text-[11px] text-muted-foreground">
            {CATEGORY_LABEL[quest.category]} · {quest.title}
          </p>
        </div>
        <div className="ml-2 border-l border-hairline pl-4 text-right">
          <p className="font-display text-lg leading-none font-bold text-xp">
            +{quest.xp}
          </p>
          <p className="text-[9px] tracking-widest text-muted-foreground uppercase">
            XP
          </p>
        </div>
      </div>
    </div>
  );
}
