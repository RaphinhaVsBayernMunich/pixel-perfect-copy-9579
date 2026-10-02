import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useQuests } from "@/lib/quests-store";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";
import { useSettings } from "@/lib/settings-store";
import { completionSound } from "@/lib/completion-sound";

/**
 * Celebrations. Style comes from the user's onboarding profile:
 *   - "mission-passed" → QuestOS cinematic banner and original chime.
 *   - "silent"         → no visual, no sound.
 *   - default          → subtle modern toast.
 */
export function QuestCelebration() {
  const last = useQuests((s) => s.lastCompletion);
  const clear = useQuests((s) => s.clearCompletion);
  const quest = useQuests((s) => (last ? s.quests.find((q) => q.id === last.questId) : undefined));
  const style = useQuests((s) => s.onboardingProfile.celebration) ?? "modern";
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const sound = useSettings((s) => s.settings.soundPack);

  useEffect(() => {
    if (!last || !quest) return;
    if (style === "silent") {
      clear();
      return;
    }

    setVisible(true);
    setFading(false);

    const FADE_MS = 700;
    const holdMs = style === "mission-passed" ? 2500 : 1500;
    const stopSound = completionSound(sound);
    const tFade = setTimeout(() => setFading(true), holdMs);
    const tHide = setTimeout(() => setVisible(false), holdMs + FADE_MS);
    const tClear = setTimeout(() => clear(), holdMs + FADE_MS + 100);
    return () => {
      clearTimeout(tFade);
      clearTimeout(tHide);
      clearTimeout(tClear);
      stopSound();
    };
  }, [last, quest, style, sound, clear]);

  if (!last || !quest || !visible) return null;

  if (style === "mission-passed") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center px-6 transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-300" />
        <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-500">
          <h2 className="font-display text-5xl font-bold text-primary">Quest complete</h2>
          <div className="rounded-xl border border-white/15 bg-black/60 px-5 py-2 text-center">
            <p className="text-[11px] tracking-[0.25em] text-white/60 uppercase">
              {CATEGORY_LABEL[quest.category]}
            </p>
            <p className="font-display text-lg font-semibold text-white">{quest.title}</p>
            <p className="font-display text-2xl font-bold text-[#f6a41c]">+{quest.xp} XP</p>
          </div>
        </div>
      </div>
    );
  }

  const color = CATEGORY_TOKEN[quest.category];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4"
    >
      <div className="animate-in fade-in slide-in-from-top-4 flex items-center gap-3 rounded-2xl border border-hairline bg-card/90 px-5 py-3 shadow-glow-xp backdrop-blur-xl duration-300">
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
          <p className="font-display text-lg leading-none font-bold text-xp">+{quest.xp}</p>
          <p className="text-[9px] tracking-widest text-muted-foreground uppercase">XP</p>
        </div>
      </div>
    </div>
  );
}
