/**
 * Small pill that hovers above the FAB showing "Premium · 5d left" while
 * on trial, and "Upgrade" once expired. Tapping opens the paywall.
 * Auto-hides for active paid subscribers.
 */
import { Sparkles } from "lucide-react";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export function TrialBadge() {
  const state = useSubscription();
  const openPaywall = useUI((s) => s.openPaywall);
  const days = trialDaysLeft(state);

  if (!state.loaded) return null;
  if (state.status === "premium") return null;

  const label =
    state.status === "trial" && days !== null
      ? `Premium · ${days}d left`
      : state.status === "expired"
        ? "Trial ended · Upgrade"
        : "Get Premium";

  return (
    <button
      type="button"
      onClick={openPaywall}
      className={cn(
        "fixed right-5 bottom-44 z-40 flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary shadow-sm backdrop-blur-md transition-colors hover:bg-primary/20 md:right-8 md:bottom-28",
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </button>
  );
}
