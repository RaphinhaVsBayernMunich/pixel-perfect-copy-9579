/**
 * Trial-ended screen.
 *
 * Shown once when the user opens the app and the backend reports the trial
 * has expired. Not blocking — the app continues to work in Free mode. This
 * is only a friendly, non-punitive message plus a CTA to Premium.
 */
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSubscription } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";

const SEEN_KEY = "questos.trial_ended_seen";

export function TrialEndedGate() {
  const status = useSubscription((s) => s.status);
  const loaded = useSubscription((s) => s.loaded);
  const openPaywall = useUI((s) => s.openPaywall);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (status !== "expired") return;
    if (typeof localStorage === "undefined") return;
    const seenAt = localStorage.getItem(SEEN_KEY);
    // Show once per week at most.
    if (seenAt && Date.now() - Number(seenAt) < 7 * 24 * 60 * 60 * 1000) return;
    setOpen(true);
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  }, [loaded, status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Trial complete
        </div>
        <DialogTitle className="mt-2 font-display text-2xl font-semibold">
          Your free trial has ended.
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm">
          Continue your journey with QuestOS Premium. All your quests,
          achievements, projects and history remain available — nothing has
          been removed.
        </DialogDescription>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              setOpen(false);
              openPaywall();
            }}
          >
            See Premium
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Keep using Free
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
