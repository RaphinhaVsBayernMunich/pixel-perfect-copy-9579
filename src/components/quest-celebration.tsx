import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { useQuests } from "@/lib/quests-store";
import { CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";
import missionPassedImg from "@/assets/mission-passed.png.asset.json";
import missionPassedSfx from "@/assets/mission-passed.mp3.asset.json";

/**
 * Celebrations. Style comes from the user's onboarding profile:
 *   - "mission-passed" → GTA San Andreas banner + sound.
 *   - "silent"         → no visual, no sound.
 *   - default          → subtle modern toast.
 */
export function QuestCelebration() {
  const last = useQuests((s) => s.lastCompletion);
  const clear = useQuests((s) => s.clearCompletion);
  const quest = useQuests((s) =>
    last ? s.quests.find((q) => q.id === last.questId) : undefined,
  );
  const style = useQuests((s) => s.onboardingProfile.celebration) ?? "modern";
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!last || !quest) return;
    if (style === "silent") {
      clear();
      return;
    }

    setVisible(true);
    setFading(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const FADE_MS = 600;

    const finish = () => {
      setFading(true);
      timers.push(setTimeout(() => setVisible(false), FADE_MS));
      timers.push(setTimeout(() => clear(), FADE_MS + 100));
    };

    if (style === "mission-passed") {
      try {
        const audio = new Audio(missionPassedSfx.url);
        audio.volume = 0.9;
        audioRef.current = audio;
        audio.addEventListener("ended", finish, { once: true });
        void audio.play().catch(() => {
          // autoplay blocked — fall back to a fixed duration
          timers.push(setTimeout(finish, 4200));
        });
        // safety net if `ended` never fires
        timers.push(setTimeout(finish, 12000));
      } catch {
        timers.push(setTimeout(finish, 4200));
      }
    } else {
      timers.push(setTimeout(finish, 1500));
    }

    return () => {
      timers.forEach(clearTimeout);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [last?.ts]);

  if (!last || !quest || !visible) return null;

  if (style === "mission-passed") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center px-6 transition-opacity duration-[600ms] ${fading ? "opacity-0" : "opacity-100"}`}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-300" />
        <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-500">
          <img
            src={missionPassedImg.url}
            alt="Mission Passed — Respect +99"
            className="w-[min(88vw,720px)] drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] select-none"
            draggable={false}
          />
          <div className="rounded-xl border border-white/15 bg-black/60 px-5 py-2 text-center">
            <p className="text-[11px] tracking-[0.25em] text-white/60 uppercase">
              {CATEGORY_LABEL[quest.category]}
            </p>
            <p className="font-display text-lg font-semibold text-white">
              {quest.title}
            </p>
            <p className="font-display text-2xl font-bold text-[#f6a41c]">
              +{quest.xp} XP
            </p>
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
